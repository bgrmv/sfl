// Golden master of the statistics calculation (S2.2).
//
// The anonymized snapshot of the league (`pnpm exec node ../.devcontainer/anonymize-dump.cjs`,
// see S11.2) is loaded into an in-memory MongoDB, the metadata of every game and
// player is calculated again by the real code path (GamesService + PlayerMetadataService),
// and the result is compared twice:
//   1. with the metadata stored in the dump: it was written by the code of that
//      time, so differences show what a fix changed (printed, not asserted);
//   2. with a baseline of the current code, created on the first run: a
//      refactoring (S3.1, S3.3, S3.5) must not change it.
//
// The dump is not in git. Without it the test is skipped; the path comes from
// SFL_GOLDEN_DIR (default: _dumps/prod-2026-11-12-anonymized in the repository).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GamesService } from '../../src/entities/games/games.service';
import { createTestApp, TestApp } from '../helpers/test-app';

const { EJSON } = mongoose.mongo.BSON;

const DIR = resolve(
  process.env.SFL_GOLDEN_DIR ||
    join(__dirname, '..', '..', '..', '_dumps', 'prod-2026-11-12-anonymized'),
);
const BASELINE = join(DIR, 'golden-baseline.json');
const REPORT = join(DIR, 'golden-report.json');

const read = (collection: string): any[] =>
  EJSON.parse(readFileSync(join(DIR, `prod.${collection}.json`), 'utf8'), {
    relaxed: false,
  }) as any[];

type Flat = Record<string, number | string | boolean | null>;

/** `{ a: { b: 1 } }` -> `{ 'a.b': 1 }`, so two results are compared field by field. */
function flatten(value: unknown, path = '', out: Flat = {}): Flat {
  if (Array.isArray(value)) {
    if (value.length === 0) out[path] = '[]';
    value.forEach((item, i) => flatten(item, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) out[path] = '{}';
    for (const [key, item] of entries) {
      if (key === 'errors') continue; // timestamps of the calculation
      flatten(item, path ? `${path}.${key}` : key, out);
    }
  } else {
    out[path] =
      value instanceof Date
        ? value.toISOString()
        : ((value ?? null) as Flat[string]);
  }
  return out;
}

const plain = (doc: any) => JSON.parse(JSON.stringify(doc));

function diff(stored: Flat, current: Flat) {
  const changed: Record<string, [unknown, unknown]> = {};
  for (const key of new Set([
    ...Object.keys(stored),
    ...Object.keys(current),
  ])) {
    const a = stored[key] ?? null;
    const b = current[key] ?? null;
    const equal =
      typeof a === 'number' && typeof b === 'number'
        ? Math.abs(a - b) < 1e-9
        : a === b;
    if (!equal) changed[key] = [a, b];
  }
  return changed;
}

describe.skipIf(
  !existsSync(BASELINE.replace('golden-baseline.json', 'prod.games.json')),
)('golden master of the statistics (S2.2)', () => {
  let t: TestApp;
  let stored: { games: Record<string, Flat>; players: Record<string, Flat> };
  let current: typeof stored;

  const collect = async () => {
    const games: Record<string, Flat> = {};
    for (const g of await t.model('Game').find().lean()) {
      games[String(g._id)] = flatten(plain(g.metadata ?? {}));
    }
    const players: Record<string, Flat> = {};
    for (const p of await t.model('Player').find().lean()) {
      players[String(p._id)] = flatten(plain(p.metadata ?? {}));
    }
    return { games, players };
  };

  beforeAll(async () => {
    t = await createTestApp();
    const Game = t.model('Game');
    const Player = t.model('Player');

    // In the dump every game has the status `new` although it has statistics:
    // the status was added later and never migrated. Only a published game
    // counts (GLOSSARY), so the games with statistics are treated as published;
    // the migration of the statuses is S3.14.
    const games = read('games').map(g => ({
      ...g,
      status: g.statistics?.length ? 'published' : g.status,
    }));
    await Game.collection.insertMany(games);
    await Player.collection.insertMany(read('players'));
    stored = await collect();

    // Calculate from scratch: no stale seasons from the dump
    await Player.collection.updateMany({}, { $set: { metadata: {} } });
    const service = t.app.get(GamesService) as any;
    const ordered = (
      await Game.find().sort({ season: 1, number: 1 }).exec()
    ).map(g => g.toJSON());
    for (const game of ordered) await service.runMetadataFlow(game);
    current = await collect();
  });

  afterAll(async () => {
    await t?.close();
  });

  it('differences from the metadata stored in the dump (report, not a failure)', () => {
    const report = {
      games: {} as Record<string, unknown>,
      players: {} as Record<string, unknown>,
      fields: {} as Record<string, number>,
    };
    for (const kind of ['games', 'players'] as const) {
      for (const id of Object.keys(stored[kind])) {
        const changed = diff(stored[kind][id], current[kind][id] ?? {});
        if (Object.keys(changed).length === 0) continue;
        report[kind][id] = changed;
        for (const key of Object.keys(changed)) {
          // `metadata.players.<id>.x` and `bySeason.<year>.x` are counted by the field
          const field = `${kind}:${key.replace(/\.[0-9a-f-]{36}\./, '.<player>.').replace(/bySeason\.\d+/, 'bySeason.<year>')}`;
          report.fields[field] = (report.fields[field] ?? 0) + 1;
        }
      }
    }
    writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

    const top = Object.entries(report.fields)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    console.info(
      `golden: ${Object.keys(report.games).length}/${Object.keys(stored.games).length} games and ` +
        `${Object.keys(report.players).length}/${Object.keys(stored.players).length} players differ from the stored metadata; ` +
        `report: ${REPORT}\n${top.map(([f, n]) => `  ${n}\t${f}`).join('\n')}`,
    );
    expect(Object.keys(stored.games).length).toBeGreaterThan(0);
  });

  it('the current calculation equals the baseline (it must not change in a refactoring)', () => {
    if (!existsSync(BASELINE)) {
      mkdirSync(DIR, { recursive: true });
      writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
      console.info(`golden: baseline created: ${BASELINE}`);
      return;
    }
    const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
    const changed: Record<string, unknown> = {};
    for (const kind of ['games', 'players'] as const) {
      for (const id of new Set([
        ...Object.keys(baseline[kind]),
        ...Object.keys(current[kind]),
      ])) {
        const d = diff(baseline[kind][id] ?? {}, current[kind][id] ?? {});
        if (Object.keys(d).length) changed[`${kind}:${id}`] = d;
      }
    }
    expect(changed).toEqual({});
  });
});
