import { createTestApp, TestApp } from '../helpers/test-app';
import {
  bearer,
  confirmTwice,
  createPlayers,
  gameBody,
  isSuccess,
  postGame,
  revokeGame,
} from '../helpers/fixtures';

describe('API: games', () => {
  let t: TestApp;
  let playerIds: [string, string];

  beforeAll(async () => {
    t = await createTestApp();
    const players = await createPlayers(t, 2);
    playerIds = [players[0].id, players[1].id];
  });

  afterAll(() => t.close());

  const post = (body: unknown) => postGame(t, body as object);

  it('creates a game and returns it by id and in the list', async () => {
    const created = await post(gameBody(playerIds, { number: 1 }));

    expect(isSuccess(created.status)).toBe(true);
    expect(created.body.ok).toBe(true);
    expect(created.body.data).toMatchObject({ number: 1, season: 2024 });

    const byId = await t.api().get(`/rest/games/${created.body.data.id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.data.statistics).toHaveLength(2);

    const list = await t.api().get('/rest/games').query({ season: 2024 });
    expect(list.status).toBe(200);
    expect(list.body.data.map((g: { number: number }) => g.number)).toContain(
      1,
    );
  });

  it('calculates the score metadata, readable with GET', async () => {
    const created = await post(gameBody(playerIds, { number: 2 }));
    const {
      body: { data: body },
    } = await t.api().get(`/rest/games/${created.body.data.id}`);

    expect(body.metadata).toMatchObject({
      score: [2, 1],
      scoreFirstDraft: 2,
      scoreSecondDraft: 1,
      scoreIsDraw: false,
      isTeamFromFirstDraftWon: true,
    });
    expect(body.metadata.players[playerIds[0]]).toMatchObject({
      hasWon: true,
      hasLose: false,
    });
  });

  it('filters games by season and number', async () => {
    await post(gameBody(playerIds, { number: 3, season: 2023 }));

    const bySeason = await t.api().get('/rest/games').query({ season: 2023 });
    expect(bySeason.body.data).toHaveLength(1);

    const byNumber = await t
      .api()
      .get('/rest/games')
      .query({ season: 2023, number: 3 });
    expect(byNumber.body.data).toHaveLength(1);
  });

  it('a list without filters is newest first and has a limit (S12.4)', async () => {
    await post(gameBody(playerIds, { number: 5, season: 2022 }));
    await post(gameBody(playerIds, { number: 6, season: 2022 }));

    const all = await t.api().get('/rest/games');
    const keys = all.body.data.map((g: { season: number; number: number }) => [
      g.season,
      g.number,
    ]);
    const sorted = [...keys].sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    expect(keys).toEqual(sorted);

    const two = await t.api().get('/rest/games').query({ limit: 2 });
    expect(two.body.data).toHaveLength(2);
    expect(two.body.data.map((g: { number: number }) => g.number)).toEqual(
      all.body.data.slice(0, 2).map((g: { number: number }) => g.number),
    );

    const skipped = await t
      .api()
      .get('/rest/games')
      .query({ limit: 1, offset: 1 });
    expect(skipped.body.data[0].id).toBe(all.body.data[1].id);
  });

  it('a limit out of 1..500 answers 400', async () => {
    for (const limit of ['0', '501', 'x']) {
      const res = await t.api().get('/rest/games').query({ limit });
      expect(res.status, limit).toBe(400);
    }
  });

  it('updates a game with PATCH', async () => {
    const created = await post(
      gameBody(playerIds, { number: 4, status: 'draft' }),
    );
    const id = created.body.data.id;

    const res = await t
      .api()
      .patch(`/rest/games/${id}`)
      .set('Authorization', bearer(t))
      .send({
        ...gameBody(playerIds, { number: 4, status: 'draft' }),
        id,
        description: 'edited',
      });

    expect(isSuccess(res.status)).toBe(true);

    const {
      body: { data: body },
    } = await t.api().get(`/rest/games/${id}`).set('Authorization', bearer(t));
    expect(body.description).toBe('edited');
  });

  it('replaces a game with PUT', async () => {
    const created = await post(
      gameBody(playerIds, { number: 5, status: 'draft' }),
    );
    const id = created.body.data.id;

    const res = await t
      .api()
      .put(`/rest/games/${id}`)
      .set('Authorization', bearer(t))
      .send(
        gameBody(playerIds, {
          number: 5,
          status: 'draft',
          description: 'replaced',
        }),
      );

    expect(isSuccess(res.status)).toBe(true);

    const {
      body: { data: body },
    } = await t.api().get(`/rest/games/${id}`).set('Authorization', bearer(t));
    expect(body.description).toBe('replaced');
  });

  it('deletes a game', async () => {
    const created = await post(gameBody(playerIds, { number: 6 }));
    const id = created.body.data.id;

    const res = await t
      .api()
      .delete(`/rest/games/${id}`)
      .set('Authorization', bearer(t));
    expect(isSuccess(res.status)).toBe(true);

    const after = await t
      .api()
      .get('/rest/games')
      .query({ season: 2024, number: 6 });
    expect(after.body.data).toHaveLength(0);
  });

  describe('invalid body: 400 with the list of issues', () => {
    // it.each is evaluated before beforeAll: real player ids are not needed here
    const ids: [string, string] = ['p1', 'p2'];

    it.each([
      ['empty body', {}],
      ['number out of range', gameBody(ids, { number: 99 })],
      ['unknown status', gameBody(ids, { status: 'BROKEN' })],
      ['one team only', gameBody(ids, { teams: [] })],
      ['season as a string', gameBody(ids, { season: '2024' })],
      [
        'negative goals',
        gameBody(ids, {
          statistics: [
            {
              ...gameBody(ids).statistics[0],
              goalsByLeg: -1,
            },
          ],
        }),
      ],
    ])('POST: %s', async (_name, body) => {
      const res = await post(body);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Validation failed');
      expect(res.body.error.issues.length).toBeGreaterThan(0);
    });

    it('PATCH: without id in the body', async () => {
      const res = await t
        .api()
        .patch('/rest/games/some-id')
        .set('Authorization', bearer(t))
        .send(gameBody(ids));

      expect(res.status).toBe(400);
    });

    it('PUT: empty body', async () => {
      const res = await t
        .api()
        .put('/rest/games/some-id')
        .set('Authorization', bearer(t))
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('error statuses (S3.12)', () => {
    const auth = () => ({ Authorization: bearer(t) });
    const MISSING = '64b7f0f0f0f0f0f0f0f0f0f0';

    it('a duplicate game answers 409', async () => {
      await post(gameBody(playerIds, { number: 20 }));
      const res = await post(gameBody(playerIds, { number: 20 }));

      expect(res.status).toBe(409);
    });

    it('a missing game answers 404 on delete, PATCH and PUT', async () => {
      const del = await t.api().delete(`/rest/games/${MISSING}`).set(auth());
      const patch = await t
        .api()
        .patch(`/rest/games/${MISSING}`)
        .set(auth())
        .send({ ...gameBody(playerIds, { status: 'draft' }), id: MISSING });
      const put = await t
        .api()
        .put(`/rest/games/${MISSING}`)
        .set(auth())
        .send(gameBody(playerIds, { status: 'draft' }));

      expect([del.status, patch.status, put.status]).toEqual([404, 404, 404]);
    });

    it('a broken game id answers 400, not 500', async () => {
      const res = await t.api().get('/rest/games/not-an-id');

      expect(res.status).toBe(400);
    });

    it('the error body is { ok: false, error: { status, code, message } }', async () => {
      const res = await t.api().delete(`/rest/games/${MISSING}`).set(auth());

      expect(res.body).toEqual({
        ok: false,
        error: {
          status: 404,
          code: 'NOT_FOUND',
          message: 'Game is not found',
        },
      });
    });
  });

  describe('rules of the league on the API', () => {
    it('a game without a captain in a team answers 400 and is not stored', async () => {
      const body = gameBody(playerIds, { number: 21 });
      body.statistics = body.statistics.map(s => ({ ...s, isCaptain: false }));

      const res = await post(body);
      const stored = await t
        .api()
        .get('/rest/games')
        .query({ season: 2024, number: 21 });

      expect(res.status).toBe(400);
      expect(res.body.error.issues[0].message).toBe(
        'Each team needs exactly one captain',
      );
      expect(stored.body.data).toHaveLength(0);
    });

    it('a draft with a player without a position is not published: the confirmation answers 400', async () => {
      const body = gameBody(playerIds, { number: 23, status: 'draft' });
      body.statistics[1] = { ...body.statistics[1], position: null };
      const created = await post(body);

      const res = await t
        .api()
        .post(`/rest/games/${created.body.data.id}/confirm`)
        .set('Authorization', bearer(t));

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(
        'A published game needs a position for every player',
      );
    });

    it('the same game as a draft may have players without a position', async () => {
      const body = gameBody(playerIds, { number: 24, status: 'draft' });
      body.statistics[1] = { ...body.statistics[1], position: null };

      const res = await post(body);

      expect(isSuccess(res.status)).toBe(true);
    });

    it('the create response already contains the calculated metadata', async () => {
      const res = await post(gameBody(playerIds, { number: 22 }));

      expect(res.body.data.metadata.score).toEqual([2, 1]);
      expect(res.body.data.metadata.players[playerIds[0]]).toMatchObject({
        hasWon: true,
      });
    });

    it('the PATCH response contains the metadata of the stored game', async () => {
      const created = await post(
        gameBody(playerIds, { number: 25, status: 'draft' }),
      );
      const id = created.body.data.id;
      const stats = gameBody(playerIds).statistics;
      stats[1] = { ...stats[1], goalsByLeg: 5 };

      const res = await t
        .api()
        .patch(`/rest/games/${id}`)
        .set('Authorization', bearer(t))
        .send({
          ...gameBody(playerIds, { number: 25, status: 'draft' }),
          id,
          statistics: stats,
        });

      expect(res.body.data.metadata.score).toEqual([2, 5]);
    });
  });

  describe('only a published game counts for the players', () => {
    const season = 2019;
    const totalGames = async (playerId: string) => {
      const {
        body: { data: body },
      } = await t
        .api()
        .get(`/rest/players/${playerId}`)
        .query({ includeMetadata: true });
      return body.metadata?.bySeason?.[season]?.totalGames ?? 0;
    };

    it('a draft is not counted; two confirmations count it; a revoke takes it back', async () => {
      const [a, b] = await createPlayers(t, 2);
      const ids: [string, string] = [a.id, b.id];
      const draft = gameBody(ids, { number: 40, season, status: 'draft' });
      const created = await post(draft);
      const id = created.body.data.id;
      expect(await totalGames(a.id)).toBe(0);

      await confirmTwice(t, id);
      expect(await totalGames(a.id)).toBe(1);

      await revokeGame(t, id);
      expect(await totalGames(a.id)).toBe(0);
    });
  });
});
