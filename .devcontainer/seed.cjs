// Synthetic dev data for the local MongoDB. No real people, no real hashes.
//
//   node .devcontainer/seed.cjs          seed if the database is empty
//   node .devcontainer/seed.cjs --reset  drop the database and seed again
//
// The administrator is admin@sfl.local / admin unless SEED_ADMIN_EMAIL and
// SEED_ADMIN_PASSWORD are set. On a shared environment (staging) always set them.
//
// Games are not seeded: their metadata is calculated by the server,
// so create them through the client or POST /rest/games as admin.
const { createHash, randomUUID } = require('node:crypto');
const { mongoose, connect, run } = require('./db.cjs');

const { ObjectId, UUID } = mongoose.Types;

const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@sfl.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin',
};
// players.controller.ts assigns this id as the USER role of new players
const USER_ROLE_ID = '658ddee2f71a72e6d8ea95f8';
const PLAYERS_COUNT = 12;

const hash = str => createHash('sha-512').update(str).digest('hex');

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
    {
      _id: new ObjectId(),
      name: 'BMW',
      color: 'WHITE',
      description: null,
      logo: null,
    },
    {
      _id: new ObjectId(),
      name: 'HONDA',
      color: 'RED',
      description: null,
      logo: null,
    },
  ];

  return { roles, users, players, teams };
}

// Returns true when the data was written, false when the database was not empty
async function seed(db, { reset = false, log = console.log } = {}) {
  if (reset) {
    await db.dropDatabase();
    log('Dropped the database');
  } else if ((await db.collection('users').countDocuments()) > 0) {
    log('Database is not empty, seed skipped (use --reset)');
    return false;
  }

  const data = buildData();
  for (const [collection, docs] of Object.entries(data)) {
    await db.collection(collection).insertMany(docs);
    log(`${collection}: ${docs.length}`);
  }
  return true;
}

module.exports = { seed };

if (require.main === module) {
  run(async () => {
    const { db, dbName } = await connect();
    console.log(`Database "${dbName}"`);
    const done = await seed(db, { reset: process.argv.includes('--reset') });
    // The password of a chosen administrator is not printed
    if (done) {
      const custom = Boolean(process.env.SEED_ADMIN_PASSWORD);
      console.log(
        `Admin: ${ADMIN.email}${custom ? '' : ` / ${ADMIN.password}`}`,
      );
    }
  });
}
