// Dumps every collection of the dev database into JSON files.
//
//   node .devcontainer/db-dump.cjs         into _dumps/<db>-<date>-<time>/
//   node .devcontainer/db-dump.cjs <dir>   into <dir>/
//
// Files are named <db>.<collection>.json and hold a JSON array in relaxed
// Extended JSON, the same format as a Compass export, so ObjectId, UUID
// and Date values survive the round trip through db-restore.cjs.
const { mkdirSync, writeFileSync } = require('node:fs');
const { join, relative, resolve } = require('node:path');
const { ROOT, EJSON, connect, run } = require('./db.cjs');

function defaultDir(dbName) {
  // 2026-10-25T21:24:05.123Z -> 2026-10-25-2124
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  return join(ROOT, '_dumps', `${dbName}-${stamp}`);
}

run(async () => {
  const { db, dbName } = await connect();
  const dir = process.argv[2] ? resolve(process.argv[2]) : defaultDir(dbName);
  mkdirSync(dir, { recursive: true });

  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map(({ name }) => name)
    .filter((name) => !name.startsWith('system.'))
    .sort();

  for (const name of collections) {
    const docs = await db.collection(name).find().toArray();
    const json = EJSON.stringify(docs, null, 2, { relaxed: true });
    writeFileSync(join(dir, `${dbName}.${name}.json`), json + '\n');
    console.log(`${name}: ${docs.length}`);
  }
  const shown = relative(ROOT, dir);
  console.log(`Dumped "${dbName}" into ${shown.startsWith('..') ? dir : shown || '.'}`);
});
