// S3.14: recalculation of the stored metadata of all games by the current rules
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  bearer,
  createPlayers,
  gameBody,
  stat,
  TEAM_RED,
  TEAM_WHITE,
} from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

interface Report {
  applied: boolean;
  gamesTotal: number;
  gamesChanged: number;
  playersChanged: number;
  skipped: { gameId: string; number: number; reason: string }[];
  failedBatches: { gameIds: string[]; error: string }[];
}

describe('API: POST /migrations/recalculate-games', () => {
  let t: TestApp;
  let ids: string[];
  let goodGameId: string;

  beforeAll(async () => {
    t = await createTestApp();
    ids = (await createPlayers(t, 4)).map(p => p.id);

    // Game 1: white 1:2 red (a leg goal and a penalty of the red captain)
    const res = await t
      .api()
      .post('/rest/games')
      .set(auth())
      .send({
        ...gameBody([ids[0], ids[1]], { number: 1 }),
        statistics: [
          stat(ids[0], TEAM_WHITE.id, {
            isCaptain: true,
            goalsByLeg: 1,
            position: 'GK',
          }),
          stat(ids[1], TEAM_RED.id, {
            isCaptain: true,
            goalsByLeg: 1,
            goalsByPenalty: 1,
            position: 'FRWD',
          }),
        ],
      });
    expect(res.status).toBe(201);
    goodGameId = res.body.data.id;

    // The game and the players as the old calculation left them: the second
    // team never won, the penalty was not counted, the players' totals are old
    const Game = t.model('Game');
    const old = await Game.findById(goodGameId).lean<any>();
    const players = Object.fromEntries(
      Object.entries(old.metadata.players).map(([id, p]: [string, any]) => [
        id,
        { ...p, hasWon: false, hasLose: false },
      ]),
    );
    await Game.updateOne(
      { _id: goodGameId },
      {
        $set: {
          'metadata.players': players,
          'metadata.scoreSecondDraft': 1,
          'metadata.teamWon': null,
        },
      },
    );

    // A published game with no captain, and a played game of status `new`
    // with no positions (the real data: all games are `new`)
    await Game.collection.insertMany([
      {
        ...gameBody([ids[2], ids[3]], { number: 2 }),
        teams: [TEAM_WHITE, TEAM_RED],
        statistics: [
          stat(ids[2], TEAM_WHITE.id, { position: 'GK' }),
          stat(ids[3], TEAM_RED.id, { isCaptain: true, position: 'GK' }),
        ],
        metadata: {},
      },
      {
        ...gameBody([ids[2], ids[3]], { number: 3, status: 'new' }),
        statistics: [
          stat(ids[2], TEAM_WHITE.id, { isCaptain: true, goalsByLeg: 1 }),
          stat(ids[3], TEAM_RED.id, { isCaptain: true }),
        ],
        metadata: {},
      },
      {
        ...gameBody([ids[2], ids[3]], { number: 4 }),
        statistics: [
          stat(ids[2], TEAM_WHITE.id, { isCaptain: true }),
          stat(ids[3], TEAM_RED.id, { isCaptain: true }),
        ],
        metadata: {},
      },
      {
        ...gameBody([ids[2], ids[3]], { number: 5, status: 'new' }),
        statistics: undefined,
        metadata: {},
      },
      {
        ...gameBody([ids[2], ids[3]], { number: 6, status: 'new' }),
        statistics: [
          stat(ids[2], TEAM_WHITE.id, { isCaptain: true }),
          stat(ids[3], '64b7f0f0f0f0f0f0f0f0aa99', { isCaptain: true }),
        ],
        metadata: {},
      },
    ] as never);
  });
  afterAll(() => t.close());

  const auth = () => ({ Authorization: bearer(t) });
  const run = async (body: Record<string, unknown>) => {
    const res = await t
      .api()
      .post('/rest/migrations/recalculate-games')
      .set(auth())
      .send(body);
    expect(res.status).toBe(201);
    return res.body.data as Report;
  };
  const gameOf = (id: string) => t.model('Game').findById(id).lean<any>();

  it('is a dry run by default (empty body) and writes nothing', async () => {
    const before = await gameOf(goodGameId);
    const playersBefore = await t.model('Player').find().lean();

    const res = await t
      .api()
      .post('/rest/migrations/recalculate-games')
      .set(auth());
    expect(res.status).toBe(201);
    const report = res.body.data as Report;

    expect(report.applied).toBe(false);
    expect(report.gamesTotal).toBe(6);
    expect(report.gamesChanged).toBeGreaterThanOrEqual(1);
    expect(report.playersChanged).toBeGreaterThanOrEqual(1);
    expect(await gameOf(goodGameId)).toEqual(before);
    expect(await t.model('Player').find().lean()).toEqual(playersBefore);
  });

  it('ignores a dryRun query parameter: only the body counts', async () => {
    const before = await gameOf(goodGameId);
    const res = await t
      .api()
      .post('/rest/migrations/recalculate-games?apply=true&dryRun=false')
      .set(auth());
    expect(res.status).toBe(201);
    expect(res.body.data.applied).toBe(false);
    expect(await gameOf(goodGameId)).toEqual(before);
  });

  it('applies: fixes the stored metadata and the totals, skips the games that fail the rules', async () => {
    const preview = await run({ apply: false });
    const report = await run({ apply: true });

    expect(report.applied).toBe(true);
    expect(report.gamesChanged).toBe(preview.gamesChanged);
    expect(report.playersChanged).toBe(preview.playersChanged);
    expect(report.playersChanged).toBeGreaterThanOrEqual(1);
    expect(report.failedBatches).toEqual([]);
    expect(report.skipped.map(s => [s.number, s.reason]).sort()).toEqual([
      [2, 'CAPTAINS_COUNT'],
      [4, 'MISSING_POSITION'],
      [5, 'INVALID_GAME'],
      [6, 'UNKNOWN_TEAM'],
    ]);

    const game = await gameOf(goodGameId);
    expect(game.metadata.scoreSecondDraft).toBe(2);
    expect(game.metadata.teamWon).toBe(TEAM_RED.id);
    expect(game.metadata.players[ids[1]].hasWon).toBe(true);
    expect(game.metadata.players[ids[1]].hasLose).toBe(false);
    expect(game.metadata.players[ids[0]].hasWon).toBe(false);
    expect(game.metadata.players[ids[0]].hasLose).toBe(true);
    expect(game.metadata.players[ids[1]].totalGoalsByPenalty).toBe(1);

    // A `new` game is recalculated too, and no status is ever changed
    const three = await t.model('Game').findOne({ number: 3 }).lean<any>();
    expect(three.status).toBe('new');
    expect(three.metadata.scoreFirstDraft).toBe(1);
    expect(
      (await t.model('Game').find().sort({ number: 1 }).lean()).map(
        (g: any) => g.status,
      ),
    ).toEqual(['published', 'published', 'new', 'published', 'new', 'new']);

    // The totals of the players equal a calculation from scratch
    const verify = await t
      .api()
      .post('/rest/players/recalculations/full')
      .set(auth())
      .send({ seasonId: 2024 });
    expect(verify.body.data.differences).toEqual([]);
    const winner = await t.model('Player').findById(ids[1]).lean<any>();
    expect(
      winner.metadata.bySeason['2024'].totalWonGames,
    ).toBeGreaterThanOrEqual(1);
  });

  it('keeps gamesIds of every player equal to the published games of the season', async () => {
    const published = await t
      .model('Game')
      .find({ season: 2024, status: 'published' })
      .lean<any>();
    for (const id of ids) {
      const expected = published
        .filter((g: any) =>
          g.statistics?.some((s: any) => String(s.playerId) === id),
        )
        .filter((g: any) => g.metadata?.players?.[id])
        .map((g: any) => String(g._id))
        .sort();
      const player = await t.model('Player').findById(id).lean<any>();
      const got = [...(player.metadata?.bySeason?.['2024']?.gamesIds ?? [])]
        .map(String)
        .sort();
      expect(got).toEqual(expected);
    }
  });

  it('is idempotent: the second run changes nothing', async () => {
    const report = await run({ apply: true });
    expect(report.gamesChanged).toBe(0);
    expect(report.playersChanged).toBe(0);
    expect(report.skipped).toHaveLength(4);
  });

  it.each([
    { dryRun: true },
    { apply: 'yes' },
    { apply: true, publishPlayedGames: true },
  ])('rejects the body %j with 400', async body => {
    const res = await t
      .api()
      .post('/rest/migrations/recalculate-games')
      .set(auth())
      .send(body);
    expect(res.status).toBe(400);
  });
});

describe('API: recalculate-games with failing writes', () => {
  let t: TestApp;
  let ids: string[];

  beforeAll(async () => {
    t = await createTestApp();
    ids = (await createPlayers(t, 2)).map(p => p.id);
    // 12 games with stale (empty) metadata: two batches of 10 and 2
    await t.model('Game').collection.insertMany(
      Array.from({ length: 12 }, (_, i) => ({
        ...gameBody([ids[0], ids[1]], { number: i + 1, status: 'new' }),
        metadata: {},
      })) as never,
    );
  });
  afterAll(() => t.close());

  const auth = () => ({ Authorization: bearer(t) });
  const post = () =>
    t
      .api()
      .post('/rest/migrations/recalculate-games')
      .set(auth())
      .send({ apply: true });

  it('reports a failed batch, counts only the written games and goes on', async () => {
    const Game = t.model('Game');
    const original = Game.bulkWrite.bind(Game);
    let calls = 0;
    const spy = vi.spyOn(Game, 'bulkWrite').mockImplementation(((
      ...args: Parameters<typeof original>
    ) => {
      calls += 1;
      if (calls === 1) throw new Error('write failed');
      return original(...args);
    }) as never);

    const res = await post();
    spy.mockRestore();

    expect(res.status).toBe(201);
    const report = res.body.data as Report;
    expect(report.gamesChanged).toBe(2);
    expect(report.failedBatches).toHaveLength(1);
    expect(report.failedBatches[0].gameIds).toHaveLength(10);
    expect(report.failedBatches[0].error).toContain('write failed');
    expect(report.skipped).toEqual([]);

    // A repeated run writes what was left
    const again = (await post()).body.data as Report;
    expect(again.gamesChanged).toBe(10);
    expect(again.failedBatches).toEqual([]);
  });

  it('answers 500 when every batch fails', async () => {
    await t.model('Game').updateMany({}, { $set: { metadata: {} } });
    const spy = vi
      .spyOn(t.model('Game'), 'bulkWrite')
      .mockImplementation((() => {
        throw new Error('write failed');
      }) as never);

    const res = await post();
    spy.mockRestore();

    expect(res.status).toBe(500);
  });
});
