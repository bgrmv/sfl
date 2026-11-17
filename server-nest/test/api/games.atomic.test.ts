import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { PlayerMetadataService } from '../../src/entities/statistics';
import {
  bearer,
  createPlayers,
  gameBody,
  postGame,
  moderator,
} from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

// S3.5: a game and the metadata of its players are saved in one transaction
describe('API: a game and its recalculation are atomic', () => {
  let t: TestApp;
  let playerIds: [string, string];

  beforeAll(async () => {
    t = await createTestApp();
    const players = await createPlayers(t, 2);
    playerIds = [players[0].id, players[1].id];
  });
  afterAll(() => t.close());
  afterEach(() => vi.restoreAllMocks());

  const auth = () => ({ Authorization: bearer(t) });
  const games = (number: number) => t.model('Game').find({ number }).lean();
  const player = (id: string) => t.model('Player').findById(id).lean<any>();

  const failRecalculation = () =>
    vi
      .spyOn(t.app.get(PlayerMetadataService), 'applyGameChange')
      .mockRejectedValue(new Error('recalculation failed'));

  // Lets the first player be written and fails on the second one
  // (one write per player: the season and the career together)
  const failOnSecondPlayerWrite = () => {
    const original = t.model('Player').updateOne.bind(t.model('Player'));
    let calls = 0;
    return vi.spyOn(t.model('Player'), 'updateOne').mockImplementation(((
      ...args: Parameters<typeof original>
    ) => {
      calls += 1;
      if (calls === 2) throw new Error('write failed');
      return original(...args);
    }) as never);
  };

  it('does not save a created game when the recalculation fails', async () => {
    failRecalculation();

    const res = await postGame(t, gameBody(playerIds, { number: 41 }));

    expect(res.status).toBe(500);
    expect(await games(41)).toHaveLength(0);
  });

  it('leaves nothing half-updated when the recalculation fails midway', async () => {
    // The statistics of the players change when the second confirmation publishes the game
    const created = await postGame(
      t,
      gameBody(playerIds, { number: 42, status: 'draft' }),
    );
    const id = created.body.data.id;
    await t
      .api()
      .post(`/rest/games/${id}/confirm`)
      .set('Authorization', bearer(t));
    failOnSecondPlayerWrite();

    const res = await t
      .api()
      .post(`/rest/games/${id}/confirm`)
      .set('Authorization', moderator(t));

    expect(res.status).toBe(500);
    const [stored] = await games(42);
    expect(stored.status).toBe('draft');
    expect(stored.confirmations).toHaveLength(1);
    expect((await player(playerIds[0])).metadata?.bySeason?.['2024']).toBe(
      undefined,
    );
  });

  it('keeps the previous game when the update recalculation fails', async () => {
    const created = await postGame(
      t,
      gameBody(playerIds, {
        number: 43,
        status: 'draft',
        description: 'before',
      }),
    );
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    failRecalculation();
    const res = await t
      .api()
      .put(`/rest/games/${id}`)
      .set(auth())
      .send({
        ...gameBody(playerIds, { number: 43, status: 'draft' }),
        description: 'after',
      });

    expect(res.status).toBe(500);
    expect((await games(43))[0].description).toBe('before');
  });

  it('keeps the game when the recalculation after a delete fails', async () => {
    const created = await postGame(t, gameBody(playerIds, { number: 44 }));
    const id = created.body.data.id;

    failRecalculation();
    const res = await t.api().delete(`/rest/games/${id}`).set(auth());

    expect(res.status).toBe(500);
    expect(await games(44)).toHaveLength(1);
  });

  it('answers 404, not 500, when the game is deleted during an update', async () => {
    const created = await postGame(
      t,
      gameBody(playerIds, { number: 47, status: 'draft' }),
    );
    const id = created.body.data.id;
    vi.spyOn(t.model('Game'), 'findOneAndUpdate').mockReturnValue({
      session: () => ({ exec: async () => null }),
    } as never);

    const res = await t
      .api()
      .patch(`/rest/games/${id}`)
      .set(auth())
      .send({ ...gameBody(playerIds, { number: 47, status: 'draft' }), id });

    expect(res.status).toBe(404);
  });

  it('commits both when everything succeeds', async () => {
    const res = await postGame(t, gameBody(playerIds, { number: 45 }));

    expect(res.status).toBe(201);
    expect(await games(45)).toHaveLength(1);
    expect(
      (await player(playerIds[0])).metadata.bySeason['2024'],
    ).toBeDefined();
  });

  describe('POST /players/recalculations/full', () => {
    const full = (apply = true) =>
      t
        .api()
        .post('/rest/players/recalculations/full')
        .set(auth())
        .send({ seasonId: 2024, apply });
    const tamper = () =>
      t
        .model('Player')
        .updateOne(
          { _id: playerIds[0] },
          { $set: { 'metadata.bySeason.2024.totalGames': 999 } },
        );

    it('repairs the metadata of the season and is idempotent', async () => {
      await postGame(t, gameBody(playerIds, { number: 46 }));
      await tamper();

      const first = await full();
      const stored = (await player(playerIds[0])).metadata.bySeason['2024'];
      const second = await full();

      expect(first.status).toBe(201);
      expect(first.body.data).toMatchObject({ seasonId: 2024, applied: true });
      expect(stored.totalGames).not.toBe(999);
      expect((await player(playerIds[0])).metadata.bySeason['2024']).toEqual(
        stored,
      );
      expect(second.body.data).toMatchObject({
        applied: false,
        differences: [],
      });
    });

    it('changes nothing when the write fails', async () => {
      await tamper();
      vi.spyOn(t.model('Player'), 'bulkWrite').mockRejectedValue(
        new Error('write failed'),
      );

      const res = await full();

      expect(res.status).toBe(500);
      expect(
        (await player(playerIds[0])).metadata.bySeason['2024'].totalGames,
      ).toBe(999);
    });

    it('does not write when the games of the season keep changing', async () => {
      await tamper();
      let calls = 0;
      vi.spyOn(
        t.app.get(PlayerMetadataService) as any,
        'seasonFingerprint',
      ).mockImplementation(async () => `changed-${calls++}`);

      const res = await full();

      expect(res.status).toBe(409);
      expect(
        (await player(playerIds[0])).metadata.bySeason['2024'].totalGames,
      ).toBe(999);
    });
  });
});
