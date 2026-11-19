// Replaces the email and the password of the seeded administrator on a database that is
// already seeded (S7.10). Nothing is dropped: users, players and teams stay as they are.
//
//   DATABASE_URL=... DATABASE_DB=sfl_staging \
//   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=... \
//   node .devcontainer/rotate-admin.cjs
//
// With OLD_ADMIN_EMAIL equal to SEED_ADMIN_EMAIL only the password is changed.
//
// DATABASE_URL and DATABASE_DB are required: no default, so that a forgotten variable
// cannot send the change to the local database or to the wrong one.
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { connect, run, ROOT } = require('./db.cjs');

const { hash } = createRequire(join(ROOT, 'server-nest', 'package.json'))(
  '@node-rs/argon2',
);

// The same parameters as server-nest/src/shared/utils/password.ts
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const MIN_PASSWORD = 12;

// Returns the number of sessions that were closed
async function rotateAdmin(db, { from, to, password }) {
  if (!to || !password) throw new Error('email and password are required');
  if (password.length < MIN_PASSWORD) {
    throw new Error(`the password is shorter than ${MIN_PASSWORD} characters`);
  }
  const users = db.collection('users');
  if (to !== from && (await users.findOne({ email: to }))) {
    throw new Error(`${to} already exists, nothing is changed`);
  }
  const admin = await users.findOne({ email: from });
  if (!admin) throw new Error(`${from} not found, nothing is changed`);

  await users.updateOne(
    { _id: admin._id },
    {
      $set: {
        email: to,
        password: await hash(password, ARGON2),
        passwordAlgorithm: 'argon2id',
      },
      $inc: { tokenVersion: 1 }, // refresh tokens issued before are void
    },
  );
  const { deletedCount } = await db
    .collection('sessions')
    .deleteMany({ userId: String(admin._id) });
  return deletedCount;
}

module.exports = { rotateAdmin };

if (require.main === module) {
  run(async () => {
    const { DATABASE_URL, DATABASE_DB } = process.env;
    if (!DATABASE_URL || !DATABASE_DB) {
      throw new Error('set DATABASE_URL and DATABASE_DB explicitly');
    }
    const { db, dbName } = await connect();
    const closed = await rotateAdmin(db, {
      from: process.env.OLD_ADMIN_EMAIL || 'admin@sfl.local',
      to: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    });
    console.log(
      `Database "${dbName}": administrator is ${process.env.SEED_ADMIN_EMAIL}, sessions closed: ${closed}`,
    );
  });
}
