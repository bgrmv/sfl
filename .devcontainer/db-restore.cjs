// Restores collections from a dump made by db-dump.cjs or exported by Compass.
//
//   node .devcontainer/db-restore.cjs <dir>          into empty collections only
//   node .devcontainer/db-restore.cjs <dir> --drop   drop each collection first
//
// Every <anything>.<collection>.json in <dir> is restored into <collection>
// of the dev database: the db prefix of the file name is ignored, so a dump
// of one database restores into another.
const { readdirSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { EJSON, connect, run } = require('./db.cjs');

function readDump(dir) {
  return readdirSync(dir)
    .filter((file) => /^[^.]+\..+\.json$/.test(file))
    .sort()
    .map((file) => ({
      collection: file.slice(file.indexOf('.') + 1, -'.json'.length),
      docs: EJSON.parse(readFileSync(join(dir, file), 'utf8'), { relaxed: false }),
    }));
}

run(async () => {
  const args = process.argv.slice(2);
  const drop = args.includes('--drop');
  const dirArg = args.find((arg) => !arg.startsWith('--'));
  if (!dirArg) {
    throw new Error('Usage: node .devcontainer/db-restore.cjs <dir> [--drop]');
  }

  const dump = readDump(resolve(dirArg));
  if (dump.length === 0) {
    throw new Error(`No <db>.<collection>.json files in ${dirArg}`);
  }

  const { db, dbName } = await connect();

  if (!drop) {
    // Check everything first so a refused restore leaves the database untouched
    for (const { collection } of dump) {
      if ((await db.collection(collection).countDocuments()) > 0) {
        throw new Error(
          `Collection "${collection}" is not empty, nothing restored (use --drop)`,
        );
      }
    }
  }

  for (const { collection, docs } of dump) {
    if (drop) await db.collection(collection).drop().catch(() => {});
    if (docs.length > 0) {
      await db.collection(collection).insertMany(docs);
    } else {
      // Keep empty collections: insertMany would not create them
      await db.createCollection(collection).catch(() => {});
    }
    console.log(`${collection}: ${docs.length}`);
  }
  console.log(`Restored into "${dbName}" from ${dirArg}`);
});
