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
import { bearer, createPlayers, gameBody } from '../helpers/fixtures';
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
      .spyOn(
        t.app.get(PlayerMetadataService),
        'recalculatePlayersSeasonAndCareerMetadata',
      )
      .mockRejectedValue(new Error('recalculation failed'));

  // Lets the first player be recalculated and fails on the second one:
  // season of #1, career of #1, season of #2 (the third write)
  const failOnThirdPlayerWrite = () => {
    const original = t.model('Player').updateOne.bind(t.model('Player'));
    let calls = 0;
    return vi.spyOn(t.model('Player'), 'updateOne').mockImplementation(((
      ...args: Parameters<typeof original>
    ) => {
      calls += 1;
      if (calls === 3) throw new Error('write failed');
      return original(...args);
    }) as never);
  };

  it('does not save a created game when the recalculation fails', async () => {
    failRecalculation();

    const res = await t
      .api()
      .post('/rest/games')
      .set(auth())
      .send(gameBody(playerIds, { number: 41 }));

    expect(res.status).toBe(500);
    expect(await games(41)).toHaveLength(0);
  });

  it('leaves nothing half-updated when the recalculation fails midway', async () => {
    failOnThirdPlayerWrite();

    const res = await t
      .api()
      .post('/rest/games')
      .set(auth())
      .send(gameBody(playerIds, { number: 42 }));

    expect(res.status).toBe(500);
    expect(await games(42)).toHaveLength(0);
    expect((await player(playerIds[0])).metadata?.bySeason?.['2024']).toBe(
      undefined,
    );
  });

  it('keeps the previous game when the update recalculation fails', async () => {
    const created = await t
      .api()
      .post('/rest/games')
      .set(auth())
      .send(gameBody(playerIds, { number: 43, description: 'before' }));
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    failRecalculation();
    const res = await t
      .api()
      .put(`/rest/games/${id}`)
      .set(auth())
      .send({ ...gameBody(playerIds, { number: 43 }), description: 'after' });

    expect(res.status).toBe(500);
    expect((await games(43))[0].description).toBe('before');
  });

  it('keeps the game when the recalculation after a delete fails', async () => {
    const created = await t
      .api()
      .post('/rest/games')
      .set(auth())
      .send(gameBody(playerIds, { number: 44 }));
    const id = created.body.data.id;

    failRecalculation();
    const res = await t.api().delete(`/rest/games/${id}`).set(auth());

    expect(res.status).toBe(500);
    expect(await games(44)).toHaveLength(1);
  });

  it('commits both when everything succeeds', async () => {
    const res = await t
      .api()
      .post('/rest/games')
      .set(auth())
      .send(gameBody(playerIds, { number: 45 }));

    expect(res.status).toBe(201);
    expect(await games(45)).toHaveLength(1);
    expect(
      (await player(playerIds[0])).metadata.bySeason['2024'],
    ).toBeDefined();
  });

  describe('POST /players/recalculate/season/full', () => {
    const full = () =>
      t
        .api()
        .post('/rest/players/recalculate/season/full')
        .set(auth())
        .send({ seasonId: 2024 });

    it('rebuilds the metadata of the season and is idempotent', async () => {
      await t
        .api()
        .post('/rest/games')
        .set(auth())
        .send(gameBody(playerIds, { number: 46 }));
      await t
        .model('Player')
        .updateOne(
          { _id: playerIds[0] },
          { $set: { 'metadata.bySeason.2024.games': 999 } },
        );

      const first = await full();
      const stored = (await player(playerIds[0])).metadata.bySeason['2024'];
      const second = await full();

      expect(first.status).toBe(201);
      expect(first.body.data).toMatchObject({ seasonId: 2024 });
      expect(stored.games).not.toBe(999);
      expect((await player(playerIds[0])).metadata.bySeason['2024']).toEqual(
        stored,
      );
      expect(second.status).toBe(201);
    });

    it('changes nothing when the recalculation fails midway', async () => {
      await t
        .model('Player')
        .updateOne(
          { _id: playerIds[0] },
          { $set: { 'metadata.bySeason.2024.games': 999 } },
        );
      failOnThirdPlayerWrite();

      const res = await full();

      expect(res.status).toBe(500);
      expect((await player(playerIds[0])).metadata.bySeason['2024'].games).toBe(
        999,
      );
    });
  });
});
