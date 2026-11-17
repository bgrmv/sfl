// S3.27 (ADR 0017): the statistics of the players are changed by the
// contribution of a game, and the full recalculation only verifies (and,
// on request, repairs) them. After every change of a game the stored result
// must be what a calculation from scratch gives.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PlayerMetadataService } from '../../src/entities/statistics';
import { TransactionService } from '../../src/entities/statistics';

import {
  bearer,
  createPlayers,
  gameBody,
  stat,
  TEAM_RED,
  TEAM_WHITE,
} from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

describe('API: incremental statistics equal the full recalculation', () => {
  let t: TestApp;
  let ids: string[];

  beforeAll(async () => {
    t = await createTestApp();
    ids = (await createPlayers(t, 6)).map(p => p.id);
  });
  afterAll(() => t.close());

  const auth = () => ({ Authorization: bearer(t) });

  /** White: captain `a` and `b`; red: captain `c` and `d`. */
  const body = (
    number: number,
    {
      season = 2024,
      status = 'published',
      white = [0, 1],
      red = [2, 3],
      goals = [2, 1],
      head = 0,
    }: {
      season?: number;
      status?: string;
      white?: number[];
      red?: number[];
      goals?: [number, number];
      head?: number;
    } = {},
  ) => {
    const positions = ['GK', 'DEF', 'MID', 'FRWD'] as const;
    const team = (list: number[], t: typeof TEAM_WHITE, goalsOf: number) =>
      list.map((index, i) =>
        stat(ids[index], t.id, {
          isCaptain: i === 0,
          goalsByLeg: i === 0 ? goalsOf : 0,
          goalsByHead: i === 1 ? head : 0,
          passes: i === 1 ? 1 : 0,
          position: positions[(index + number) % 4],
        }),
      );
    return {
      ...gameBody([ids[0], ids[2]], { number, season, status }),
      statistics: [
        ...team(white, TEAM_WHITE, goals[0]),
        ...team(red, TEAM_RED, goals[1]),
      ],
    };
  };

  const create = async (b: ReturnType<typeof body>) => {
    const res = await t.api().post('/rest/games').set(auth()).send(b);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body.data.id as string;
  };

  const verify = async (seasonId: number, apply = false) => {
    const res = await t
      .api()
      .post('/rest/players/recalculate/season/full')
      .set(auth())
      .send({ seasonId, apply });
    expect(res.status).toBe(201);
    return res.body.data as {
      seasonId: number;
      playersCount: number;
      applied: boolean;
      differences: { playerId: string; differences: { field: string }[] }[];
    };
  };

  const expectConsistent = async (...seasons: number[]) => {
    for (const season of seasons) {
      expect((await verify(season)).differences).toEqual([]);
    }
  };

  it('is consistent after a sequence of creates, updates and deletes', async () => {
    // Created not in the order of the numbers: the lists follow the numbers
    const g3 = await create(body(3, { goals: [1, 1] }));
    await expectConsistent(2024);
    const g1 = await create(body(1, { goals: [3, 0], head: 1 }));
    const g2 = await create(body(2, { goals: [0, 2], white: [0, 1, 4] }));
    await create(body(5, { red: [2, 3, 5], goals: [1, 2] }));
    await expectConsistent(2024);

    // A player leaves the line-up, the result changes
    const patched = await t
      .api()
      .patch(`/rest/games/${g2}`)
      .set(auth())
      .send({ ...body(2, { goals: [2, 2], white: [0, 1] }), id: g2 });
    expect(patched.status).toBe(200);
    await expectConsistent(2024);

    // Replaced with another line-up
    const replaced = await t
      .api()
      .put(`/rest/games/${g1}`)
      .set(auth())
      .send(body(1, { goals: [0, 4], white: [1, 0], red: [3, 4] }));
    expect(replaced.status).toBe(200);
    await expectConsistent(2024);

    // Removed
    const removed = await t.api().delete(`/rest/games/${g3}`).set(auth());
    expect(removed.status).toBe(200);
    await expectConsistent(2024);

    // The same save repeated changes nothing
    const again = await t
      .api()
      .put(`/rest/games/${g1}`)
      .set(auth())
      .send(body(1, { goals: [0, 4], white: [1, 0], red: [3, 4] }));
    expect(again.status).toBe(200);
    await expectConsistent(2024);
  });

  it('counts a game only while it is published', async () => {
    const draft = await create(body(10, { status: 'new', goals: [4, 0] }));
    await expectConsistent(2024);

    const publish = await t
      .api()
      .patch(`/rest/games/${draft}`)
      .set(auth())
      .send({ ...body(10, { goals: [4, 0] }), id: draft });
    expect(publish.status).toBe(200);
    await expectConsistent(2024);

    const revoke = await t
      .api()
      .patch(`/rest/games/${draft}`)
      .set(auth())
      .send({ ...body(10, { status: 'new', goals: [4, 0] }), id: draft });
    expect(revoke.status).toBe(200);
    await expectConsistent(2024);
  });

  it('a skipped week needs no teams data and counts nowhere (S10.18)', async () => {
    const before = await t.model('Player').find().lean<any>();
    const sk = { ...body(30), status: 'skipped', statistics: [] };
    const id = await create(sk);
    await expectConsistent(2024);
    expect(await t.model('Player').find().lean<any>()).toEqual(before);

    // A published game turned into a skipped week stops counting
    const played = await create(body(31, { goals: [3, 0] }));
    const skip = await t
      .api()
      .patch(`/rest/games/${played}`)
      .set(auth())
      .send({ ...body(31), status: 'skipped', statistics: [], id: played });
    expect(skip.status).toBe(200);
    await expectConsistent(2024);
    expect(id).toBeTruthy();
  });

  it('moves a game to another season', async () => {
    const id = await create(body(20, { season: 2023, goals: [1, 0] }));
    await expectConsistent(2023);

    const moved = await t
      .api()
      .put(`/rest/games/${id}`)
      .set(auth())
      .send(body(21, { season: 2025, goals: [1, 0] }));
    expect(moved.status).toBe(200);
    await expectConsistent(2023, 2025);
  });

  it('keeps the career equal to the sum of the seasons', async () => {
    const player = await t.model('Player').findById(ids[0]).lean<any>();
    const seasons = Object.values(player.metadata.bySeason) as any[];

    expect(player.metadata.byCareer.totalGames).toBe(
      seasons.reduce((total, s) => total + s.totalGames, 0),
    );
  });

  describe('POST /players/recalculate/season/full', () => {
    it('reports a difference and does not write without the flag', async () => {
      await t
        .model('Player')
        .updateOne(
          { _id: ids[0] },
          { $set: { 'metadata.bySeason.2024.totalGoals': 999 } },
        );

      const report = await verify(2024);

      expect(report.applied).toBe(false);
      expect(report.differences).toEqual([
        {
          playerId: ids[0],
          differences: expect.arrayContaining([
            {
              field: 'bySeason.2024.totalGoals',
              stored: 999,
              calculated: expect.any(Number),
            },
          ]),
        },
      ]);
      const stored = await t.model('Player').findById(ids[0]).lean<any>();
      expect(stored.metadata.bySeason['2024'].totalGoals).toBe(999);
    });

    it('repairs only with apply: true, then finds nothing', async () => {
      const repaired = await verify(2024, true);

      expect(repaired.applied).toBe(true);
      expect(repaired.differences).toHaveLength(1);
      await expectConsistent(2024);
    });

    it('does not lose the career when a game of another season is saved meanwhile', async () => {
      await t
        .model('Player')
        .updateOne(
          { _id: ids[1] },
          { $set: { 'metadata.bySeason.2024.totalGoals': 999 } },
        );
      const transactions = t.app.get(TransactionService);
      const original = transactions.run.bind(transactions);
      let saved = false;
      const spy = vi
        .spyOn(transactions, 'run')
        .mockImplementation(async work => {
          if (!saved) {
            saved = true;
            spy.mockRestore();
            await create(body(30, { season: 2022, goals: [1, 0] }));
          }
          return original(work);
        });

      const report = await verify(2024, true);

      expect(report.applied).toBe(true);
      const player = await t.model('Player').findById(ids[1]).lean<any>();
      const seasons = Object.values(player.metadata.bySeason) as any[];
      expect(player.metadata.bySeason['2022'].totalGames).toBe(1);
      expect(player.metadata.byCareer.totalGames).toBe(
        seasons.reduce((total, s) => total + s.totalGames, 0),
      );
      await expectConsistent(2022, 2024);
    });

    it('sees a change of a game that keeps the count and the last update', async () => {
      const service = t.app.get(PlayerMetadataService) as any;
      const before = await service.seasonFingerprint(2024);
      const [game] = await t
        .model('Game')
        .find({ season: 2024 })
        .sort({ updatedAt: 1 })
        .limit(1)
        .lean<any>();

      await t
        .model('Game')
        .collection.updateOne(
          { _id: game._id },
          { $set: { updatedAt: new Date(game.updatedAt.getTime() - 1000) } },
        );

      expect(await service.seasonFingerprint(2024)).not.toBe(before);
    });

    it('rejects a non-boolean flag', async () => {
      const res = await t
        .api()
        .post('/rest/players/recalculate/season/full')
        .set(auth())
        .send({ seasonId: 2024, apply: 'yes' });

      expect(res.status).toBe(400);
    });
  });
});
