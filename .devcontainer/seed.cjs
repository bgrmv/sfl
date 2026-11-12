// Synthetic dev data for the local MongoDB. No real people, no real hashes.
//
//   node .devcontainer/seed.cjs          seed if the database is empty
//   node .devcontainer/seed.cjs --reset  drop the database and seed again
//
// Games are not seeded: their metadata is calculated by the server,
// so create them through the client or POST /rest/games as admin.
const { createHash, randomUUID } = require('node:crypto');
const { mongoose, connect, run } = require('./db.cjs');

const { ObjectId, UUID } = mongoose.Types;

const ADMIN = { email: 'admin@sfl.local', password: 'admin' };
// players.controller.ts assigns this id as the USER role of new players
const USER_ROLE_ID = '658ddee2f71a72e6d8ea95f8';
const PLAYERS_COUNT = 12;

const hash = (str) => createHash('sha-512').update(str).digest('hex');

function buildData() {
  const adminRoleId = new ObjectId();
  const roles = [
    { _id: adminRoleId, name: 'ADMIN', description: 'League administrator' },
    { _id: new ObjectId(USER_ROLE_ID), name: 'USER', description: 'Player' },
  ];

  const users = [
    {
      _id: new UUID(),
      email: ADMIN.email,
      name: 'Admin',
      surname: 'Dev',
      password: hash(ADMIN.password),
      roles: [adminRoleId],
    },
  ];

  const players = [];
  for (let i = 1; i <= PLAYERS_COUNT; i++) {
    const n = String(i).padStart(2, '0');
    const userId = new UUID();
    users.push({
      _id: userId,
      email: `player${n}@sfl.local`,
      name: `Player`,
      surname: n,
      password: hash(randomUUID()),
      roles: [new ObjectId(USER_ROLE_ID)],
    });
    players.push({
      _id: new ObjectId(),
      nickname: `Player ${n}`,
      number: i,
      isCaptain: i <= 2,
      status: 'ACTIVE',
      user: userId,
      metadata: {},
    });
  }

  const teams = [
    { _id: new ObjectId(), name: 'BMW', color: 'WHITE', description: null, logo: null },
    { _id: new ObjectId(), name: 'HONDA', color: 'RED', description: null, logo: null },
  ];

  return { roles, users, players, teams };
}

run(async () => {
  const reset = process.argv.includes('--reset');
  const { db, dbName } = await connect();

  if (reset) {
    await db.dropDatabase();
    console.log(`Dropped database "${dbName}"`);
  } else if ((await db.collection('users').countDocuments()) > 0) {
    console.log(`Database "${dbName}" is not empty, seed skipped (use --reset)`);
    return;
  }

  const data = buildData();
  for (const [collection, docs] of Object.entries(data)) {
    await db.collection(collection).insertMany(docs);
    console.log(`${collection}: ${docs.length}`);
  }
  console.log(`Admin: ${ADMIN.email} / ${ADMIN.password}`);
});
