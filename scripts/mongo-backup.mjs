#!/usr/bin/env node
// Encrypted MongoDB backups and their verification (S6.1, docs/runbooks/mongo-backup.md).
//
//   pnpm backup:prod      mongodump of SFL_PROD_URI -> age -> <dir>/<name>.archive.gz.age + manifest
//   pnpm backup:verify    decrypt, restore into a local scratch database, compare document counts
//   pnpm backup:status    warn when there is no fresh backup (never fails, used by start:dev)
//
// Secrets are read from the environment only: SFL_PROD_URI (connection string
// of the database to dump), SFL_BACKUP_AGE_RECIPIENT (age public key, age1...),
// SFL_BACKUP_AGE_IDENTITY (path to the age private key, verify only).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKUP_DIR = resolve(
  process.env.SFL_BACKUP_DIR || join(ROOT, '_backups', 'prod'),
);
const MAX_AGE_DAYS = Number(process.env.SFL_BACKUP_MAX_AGE_DAYS || 30);
const SCRATCH_DB = 'sfl_restore_check';
const EXT = '.archive.gz.age';

const fail = message => {
  console.error(`backup: ${message}`);
  process.exit(1);
};

function readEnvFile() {
  const file = join(ROOT, 'server-nest', '.env');
  const env = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return env;
}

const localUrl = () =>
  process.env.DATABASE_URL ||
  readEnvFile().DATABASE_URL ||
  'mongodb://mongodb:27017';

// mongoose is a dependency of server-nest, not of the repo root
async function countDocuments(uri, dbName) {
  const mongoose = createRequire(join(ROOT, 'server-nest', 'package.json'))(
    'mongoose',
  );
  const connection = await mongoose
    .createConnection(uri, { dbName, serverSelectionTimeoutMS: 15000 })
    .asPromise();
  try {
    const names = (
      await connection.db.listCollections({}, { nameOnly: true }).toArray()
    )
      .map(({ name }) => name)
      .filter(name => !name.startsWith('system.'))
      .sort();
    const counts = {};
    for (const name of names)
      counts[name] = await connection.db.collection(name).countDocuments();
    return counts;
  } finally {
    await connection.close();
  }
}

// The URI may hold a password: it is passed as an argument but never printed
const exited = (child, label) =>
  new Promise((done, reject) => {
    child.on('error', e =>
      reject(
        new Error(
          `${label}: ${e.code === 'ENOENT' ? 'not installed (bash .devcontainer/install-backup-tools.sh)' : e.message}`,
        ),
      ),
    );
    child.on('close', code =>
      code === 0
        ? done()
        : reject(new Error(`${label} exited with code ${code}`)),
    );
  });

function listBackups() {
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith(EXT))
    .map(f => ({
      file: join(BACKUP_DIR, f),
      mtime: statSync(join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
}

async function dump() {
  const uri = process.env.SFL_PROD_URI;
  const recipient = process.env.SFL_BACKUP_AGE_RECIPIENT;
  if (!uri)
    fail('set SFL_PROD_URI (connection string of the database to dump)');
  if (!recipient?.startsWith('age1'))
    fail('set SFL_BACKUP_AGE_RECIPIENT to an age public key (age1...)');
  const dbName =
    process.env.SFL_PROD_DB ||
    new URL(uri).pathname.replace(/^\//, '') ||
    'sfl';

  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace('T', '-')
    .replace(':', '');
  const out = join(BACKUP_DIR, `${dbName}-${stamp}${EXT}`);

  console.log(`Counting documents in "${dbName}"...`);
  const counts = await countDocuments(uri, dbName);

  console.log('Dumping and encrypting...');
  const dumper = spawn(
    'mongodump',
    [`--uri=${uri}`, `--db=${dbName}`, '--archive', '--gzip', '--quiet'],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const encryptor = spawn('age', ['-r', recipient], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  await Promise.all([
    pipeline(dumper.stdout, encryptor.stdin),
    pipeline(encryptor.stdout, createWriteStream(out, { mode: 0o600 })),
    exited(dumper, 'mongodump'),
    exited(encryptor, 'age'),
  ]);

  writeFileSync(
    out.replace(EXT, '.manifest.json'),
    JSON.stringify(
      { db: dbName, createdAt: new Date().toISOString(), counts },
      null,
      2,
    ) + '\n',
  );
  console.log(`Done: ${out}`);
  console.table(counts);
  console.log(
    'Copy the .age file to storage outside this machine, then run: pnpm backup:verify',
  );
}

async function verify(arg) {
  const identity = process.env.SFL_BACKUP_AGE_IDENTITY;
  if (!identity || !existsSync(identity))
    fail('set SFL_BACKUP_AGE_IDENTITY to the path of the age private key');
  const file = arg ? resolve(arg) : listBackups()[0]?.file;
  if (!file || !existsSync(file)) fail(`no backup to verify in ${BACKUP_DIR}`);
  const manifestFile = file.replace(EXT, '.manifest.json');
  if (!existsSync(manifestFile)) fail(`manifest not found: ${manifestFile}`);
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const target = `${localUrl()}`;
  if (/mongodb\.net|\/\/[^/]*@/.test(target))
    fail(
      'refusing to restore: DATABASE_URL does not look like the local dev MongoDB',
    );

  console.log(`Restoring ${file} into local "${SCRATCH_DB}"...`);
  const decryptor = spawn('age', ['-d', '-i', identity], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const restorer = spawn(
    'mongorestore',
    [
      `--uri=${target}`,
      '--archive',
      '--gzip',
      '--drop',
      '--quiet',
      `--nsFrom=${manifest.db}.*`,
      `--nsTo=${SCRATCH_DB}.*`,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  await Promise.all([
    pipeline(createReadStream(file), decryptor.stdin),
    pipeline(decryptor.stdout, restorer.stdin),
    exited(decryptor, 'age'),
    exited(restorer, 'mongorestore'),
  ]);

  const restored = await countDocuments(target, SCRATCH_DB);
  const names = [
    ...new Set([...Object.keys(manifest.counts), ...Object.keys(restored)]),
  ].sort();
  const rows = names.map(name => ({
    collection: name,
    source: manifest.counts[name] ?? '—',
    restored: restored[name] ?? '—',
  }));
  console.table(rows);
  const bad = rows.filter(r => r.source !== r.restored);
  // Leave the scratch database in place for inspection only when counts differ
  if (bad.length === 0) {
    const mongoose = createRequire(join(ROOT, 'server-nest', 'package.json'))(
      'mongoose',
    );
    const c = await mongoose
      .createConnection(target, { dbName: SCRATCH_DB })
      .asPromise();
    await c.dropDatabase();
    await c.close();
  }
  if (bad.length)
    fail(
      `document counts differ in: ${bad.map(r => r.collection).join(', ')} (database "${SCRATCH_DB}" kept)`,
    );
  console.log(`OK: all ${rows.length} collections match the manifest`);
}

function status() {
  const [latest] = listBackups();
  if (!latest) {
    console.warn(
      `⚠ backup: no encrypted prod backup in ${BACKUP_DIR} (pnpm backup:prod, docs/runbooks/mongo-backup.md)`,
    );
    return;
  }
  const days = Math.floor((Date.now() - latest.mtime) / 86_400_000);
  if (days > MAX_AGE_DAYS)
    console.warn(
      `⚠ backup: the latest prod backup is ${days} days old (limit ${MAX_AGE_DAYS})`,
    );
}

const [command, arg] = process.argv.slice(2);
const commands = { dump, verify, status };
if (!commands[command])
  fail('usage: mongo-backup.mjs dump | verify [file] | status');
try {
  await commands[command](arg);
} catch (error) {
  fail(error.message);
}
