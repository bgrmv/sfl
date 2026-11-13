// Synthetic games for the dev database, created through the API: the server
// calculates game and player metadata, so writing to MongoDB directly would
// duplicate that logic. Run after seed.cjs, with server-nest running:
//
//   node .devcontainer/seed-games.cjs [--api https://localhost:3001/rest]
//
// Signs in as the seed admin (admin@sfl.local), so it does not work on a copy of prod.
const { connect, run } = require('./db.cjs');

const argIdx = process.argv.indexOf('--api');
const API = argIdx > 0 ? process.argv[argIdx + 1] : `https://localhost:${process.env.PORT || 3001}/rest`;
const GAMES = 3;
const SEASON = new Date().getFullYear();
// the dev server uses a self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function api(path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// the server needs exactly one captain per team to calculate game metadata
const stat = (player, team, i, isCaptain) => ({
  playerId: String(player._id),
  teamId: team.id,
  goalsByLeg: i % 3 === 0 ? 1 : 0,
  goalsByHead: 0,
  goalsByAuto: 0,
  goalsByPenalty: 0,
  passes: i % 2,
  isMVP: i === 0,
  isTransfer: false,
  isCaptain,
  position: null,
});

run(async () => {
  const { db } = await connect();
  const admin = await db.collection('users').findOne({ email: 'admin@sfl.local' });
  if (!admin) throw new Error('Run seed.cjs first: admin@sfl.local not found');
  if ((await db.collection('games').countDocuments()) > 0) {
    console.log('Games already exist, skipped');
    return;
  }

  const { accessToken } = await api('/auth/sign-in', { body: { email: 'admin@sfl.local', password: 'admin' } });
  const teams = (await db.collection('teams').find().toArray()).map((t) => ({
    id: String(t._id), name: t.name, color: t.color, description: t.description ?? '', logo: t.logo ?? '',
  }));
  const players = await db.collection('players').find().sort({ number: 1 }).toArray();

  for (let n = 1; n <= GAMES; n++) {
    const half = Math.floor(players.length / 2);
    const statistics = [
      ...players.slice(0, half).map((p, i) => stat(p, teams[0], i + n, i === 0)),
      ...players.slice(half).map((p, i) => stat(p, teams[1], i + n + 1, i === 0)),
    ];
    const game = await api('/games', {
      token: accessToken,
      body: {
        number: n,
        season: SEASON,
        playedAt: new Date(Date.UTC(SEASON, 0, 1 + n * 7, 18)).toISOString(),
        status: 'published',
        teams,
        link: '',
        description: `Synthetic game ${n}`,
        notes: ['', ''],
        statistics,
        metadata: {},
      },
    });
    console.log(`game ${n}: ${game.id ?? game._id}`);
  }
  console.log('Done. Create more games through the client.');
});
