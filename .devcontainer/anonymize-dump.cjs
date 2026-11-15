// Makes a de-identified copy of a dump made by db-dump.cjs (S11.2).
//
//   node .devcontainer/anonymize-dump.cjs <inDir> [outDir]
//
// outDir defaults to <inDir>-anonymized. The output keeps ids, links between
// documents, scores and statistics, so the golden-master tests (S2.2) give the
// same numbers as on the real data; it replaces everything that identifies a
// person: names, emails, avatars, ages, nicknames, password hashes and the
// free text of games. The script prints counts, never values.
//
// The result is for local use (seed, tests). It is not committed until the
// owner has looked at it: the whole of _dumps/ is in .gitignore.
const { createHash } = require('node:crypto');
const {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require('node:fs');
const { join, resolve } = require('node:path');
const { EJSON } = require('./db.cjs');

const DEV_PASSWORD = 'dev';
const ADMIN = { email: 'admin@sfl.local', password: 'admin' };
const sha512 = value => createHash('sha-512').update(value).digest('hex');

const [inArg, outArg] = process.argv.slice(2);
if (!inArg) {
  console.error(
    'Usage: node .devcontainer/anonymize-dump.cjs <inDir> [outDir]',
  );
  process.exit(1);
}
const inDir = resolve(inArg);
const outDir = resolve(outArg || `${inDir}-anonymized`);

const files = readdirSync(inDir).filter(f => /^[^.]+\..+\.json$/.test(f));
const collections = {};
for (const file of files) {
  const name = file.slice(file.indexOf('.') + 1, -'.json'.length);
  collections[name] = {
    prefix: file.slice(0, file.indexOf('.')),
    docs: EJSON.parse(readFileSync(join(inDir, file), 'utf8'), {
      relaxed: false,
    }),
  };
}
for (const required of ['users', 'players', 'games', 'roles']) {
  if (!collections[required])
    throw new Error(`Collection "${required}" is missing in ${inDir}`);
}

// Everything that identifies a person: collected from the input, searched for in the output
const secrets = new Set();
// Words that stay in the output on purpose (dev admin, role names)
const ALLOWED = new Set(['admin', 'user']);
const remember = value => {
  if (typeof value !== 'string') return;
  const text = value.trim().toLowerCase();
  if (text.length >= 4 && !ALLOWED.has(text)) secrets.add(text);
};

const adminRoleIds = new Set(
  collections.roles.docs
    .filter(r => r.name === 'ADMIN')
    .map(r => String(r._id)),
);

let adminDone = false;
let userNo = 0;
const users = collections.users.docs.map(user => {
  userNo += 1;
  for (const key of ['email', 'name', 'surname', 'avatar', 'password'])
    remember(user[key]);
  if (typeof user.email === 'string') remember(user.email.split('@')[0]);

  const isAdmin =
    !adminDone && (user.roles ?? []).some(id => adminRoleIds.has(String(id)));
  if (isAdmin) adminDone = true;

  const result = {
    _id: user._id,
    email: isAdmin ? ADMIN.email : `user${userNo}@example.test`,
    name: `Name${userNo}`,
    surname: `Surname${userNo}`,
    password: sha512(isAdmin ? ADMIN.password : DEV_PASSWORD),
    roles: user.roles ?? [],
  };
  // Fields this script does not know are dropped, not copied: a new field
  // with personal data cannot slip through. Their names are reported below.
  return {
    result,
    dropped: Object.keys(user).filter(
      k =>
        !(k in result) &&
        !['avatar', 'age', '__v', 'createdAt', 'updatedAt'].includes(k),
    ),
  };
});

const droppedUserFields = new Set(users.flatMap(u => u.dropped));

let playerNo = 0;
const players = collections.players.docs.map(player => {
  playerNo += 1;
  remember(player.nickname);
  return { ...player, nickname: `Player${playerNo}` };
});

// Free text of a game (link, description, the old `note`, ...) may name people:
// every top-level string except the ones listed here is blanked
const GAME_STRINGS_KEPT = new Set(['status', 'id']);
const blankedGameFields = new Set();
const games = collections.games.docs.map(game => {
  const copy = { ...game };
  for (const [key, value] of Object.entries(game)) {
    if (typeof value === 'string' && !GAME_STRINGS_KEPT.has(key)) {
      remember(value);
      copy[key] = '';
      blankedGameFields.add(key);
    }
  }
  for (const note of game.notes ?? []) remember(note);
  if ('notes' in game) {
    copy.notes = ['', ''];
    blankedGameFields.add('notes');
  }
  return copy;
});

const output = {
  users: users.map(u => u.result),
  players,
  games,
  roles: collections.roles.docs,
  ...Object.fromEntries(
    Object.entries(collections)
      .filter(
        ([name]) => !['users', 'players', 'games', 'roles'].includes(name),
      )
      .map(([name, { docs }]) => [name, docs]),
  ),
};

mkdirSync(outDir, { recursive: true });
const written = {};
for (const [name, docs] of Object.entries(output)) {
  const text = EJSON.stringify(docs, null, 2, { relaxed: true }) + '\n';
  writeFileSync(join(outDir, `${collections[name].prefix}.${name}.json`), text);
  written[name] = { docs: docs.length, text: text.toLowerCase() };
}

// Leak check: not one collected value may be left in the output
let leaks = 0;
for (const secret of secrets) {
  for (const [name, { text }] of Object.entries(written)) {
    if (text.includes(secret)) {
      leaks += 1;
      console.error(
        `LEAK: a value of length ${secret.length} from the input is still in "${name}"`,
      );
    }
  }
}

for (const [name, { docs }] of Object.entries(written))
  console.log(`${name}: ${docs}`);
if (blankedGameFields.size)
  console.log(`game fields blanked: ${[...blankedGameFields].join(', ')}`);
if (droppedUserFields.size)
  console.log(`user fields dropped: ${[...droppedUserFields].join(', ')}`);
console.log(`checked ${secrets.size} personal values, leaks: ${leaks}`);
console.log(`Written to ${outDir}`);
if (leaks) process.exit(2);
