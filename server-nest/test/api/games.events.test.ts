// The order of the goals and the pass before a goal by head (S10.27).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  bearer,
  confirmTwice,
  createPlayers,
  gameBody,
  lockGame,
  stat,
  TEAM_RED,
  TEAM_WHITE,
} from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

describe('API: the order of the goals', () => {
  let t: TestApp;
  let p: string[];
  let counter = 0;

  beforeAll(async () => {
    t = await createTestApp();
    p = (await createPlayers(t, 4)).map(player => player.id);
  });
  afterAll(() => t.close());

  const admin = () => ({ Authorization: bearer(t) });

  /** White: a scores with the head (pass of b) and with the leg (pass of c); red: x scores a penalty. */
  const body = (over: Record<string, unknown> = {}, withEvents = true) => ({
    ...gameBody([p[0], p[3]], { number: ++counter, status: 'draft' }),
    statistics: [
      stat(p[0], TEAM_WHITE.id, {
        isCaptain: true,
        goalsByHead: 1,
        goalsByLeg: 1,
        position: 'FRWD',
      }),
      stat(p[1], TEAM_WHITE.id, { passes: 1, position: 'MID' }),
      stat(p[2], TEAM_WHITE.id, { passes: 1, position: 'DEF' }),
      stat(p[3], TEAM_RED.id, {
        isCaptain: true,
        goalsByPenalty: 1,
        position: 'GK',
      }),
    ],
    ...(withEvents
      ? {
          events: [
            {
              n: 1,
              kind: 'head',
              teamId: TEAM_WHITE.id,
              authorId: p[0],
              assistIds: [p[1]],
            },
            {
              n: 2,
              kind: 'penalty',
              teamId: TEAM_RED.id,
              authorId: p[3],
              assistIds: [],
            },
            {
              n: 3,
              kind: 'goal',
              teamId: TEAM_WHITE.id,
              authorId: p[0],
              assistIds: [p[2]],
            },
          ],
        }
      : {}),
    ...over,
  });
  const create = async (b: ReturnType<typeof body>) => {
    const res = await t.api().post('/rest/games').set(admin()).send(b);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body.data.id as string;
  };
  const published = async (b: ReturnType<typeof body>) => {
    const id = await create(b);
    return (await confirmTwice(t, id)).body.data;
  };

  it('a game with the order of the goals is saved and read back with it', async () => {
    const id = await create(body());

    const game = (await t.api().get(`/rest/games/${id}`).set(admin())).body
      .data;
    expect(game.events.map((e: { kind: string }) => e.kind)).toEqual([
      'head',
      'penalty',
      'goal',
    ]);
  });

  it('a pass before a goal by head is worth 2: the points of the passer and of the game', async () => {
    const withEvents = await published(body());
    const without = await published(body({}, false));

    const points = (game: any, id: string) =>
      game.metadata.players[id].totalPoints;
    expect(points(withEvents, p[1])).toBe(2); // pass before the head goal
    expect(points(withEvents, p[2])).toBe(1); // pass before the leg goal
    expect(points(without, p[1])).toBe(1);
    expect(withEvents.metadata.totalPoints).toBe(
      without.metadata.totalPoints + 1,
    );
    // Everything else is the same: the score, the winner, the MVP
    expect(withEvents.metadata.score).toEqual(without.metadata.score);
    expect(withEvents.metadata.mvpListIds).toEqual(without.metadata.mvpListIds);
  });

  it('the season of the passer counts the extra point and equals a full calculation', async () => {
    const res = await t.api().get(`/rest/players/${p[1]}`).set(admin());
    const season = res.body.data.metadata.bySeason['2024'];

    expect(season.ancientRatingSystem.totalPoints).toBe(3); // 2 + 1
    const report = await t
      .api()
      .post('/rest/players/recalculations/full')
      .set(admin())
      .send({ seasonId: 2024, apply: false });
    expect(report.body.data.differences).toEqual([]);
  });

  it('events that do not match the totals are refused with the place', async () => {
    const bad = body();
    (bad.events as { assistIds: string[] }[])[0].assistIds = [p[0]];

    const res = await t.api().post('/rest/games').set(admin()).send(bad);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(
      res.body.error.issues.map((i: { path: string }) => i.path),
    ).toContain('events.0.assistIds.0');
  });

  it('a revoke and a new save with other events change the points back and forth', async () => {
    const game = await published(body());
    const id = game.id;
    expect(game.metadata.players[p[1]].totalPoints).toBe(2);

    await t
      .api()
      .post(`/rest/games/${id}/revoke`)
      .set(admin())
      .send({ reason: 'The order was wrong' });
    await lockGame(t, id);
    const edited = body({ number: game.number }, false);
    const put = await t
      .api()
      .put(`/rest/games/${id}`)
      .set(admin())
      .send(edited);
    expect(put.status).toBe(200);
    expect(
      (await confirmTwice(t, id)).body.data.metadata.players[p[1]].totalPoints,
    ).toBe(1);
  });
});
