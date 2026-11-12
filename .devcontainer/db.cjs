// Shared helpers for seed.cjs, db-dump.cjs and db-restore.cjs.
const { createRequire } = require('node:module');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..');
// mongoose is a dependency of server-nest, not of the repo root
const mongoose = createRequire(join(ROOT, 'server-nest', 'package.json'))(
  'mongoose',
);

function readEnv() {
  const file = join(ROOT, 'server-nest', '.env');
  const env = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2];
    }
  }
  return {
    url: process.env.DATABASE_URL || env.DATABASE_URL || 'mongodb://mongodb:27017',
    db: process.env.DATABASE_DB || env.DATABASE_DB || 'sfl',
  };
}

async function connect() {
  const { url, db } = readEnv();
  await mongoose.connect(`${url}/${db}`);
  return { db: mongoose.connection.db, dbName: db };
}

function run(main) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { ROOT, mongoose, EJSON: mongoose.mongo.BSON.EJSON, connect, run };
