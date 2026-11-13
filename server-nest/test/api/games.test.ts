import { createTestApp, TestApp } from '../helpers/test-app';
import {
  bearer,
  createPlayers,
  gameBody,
  isSuccess,
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

  const post = (body: unknown) =>
    t
      .api()
      .post('/rest/games')
      .set('Authorization', bearer(t))
      .send(body as object);

  it('creates a game and returns it by id and in the list', async () => {
    const created = await post(gameBody(playerIds, { number: 1 }));

    expect(isSuccess(created.status)).toBe(true);
    expect(created.body).toMatchObject({ number: 1, season: 2024 });

    const byId = await t.api().get(`/rest/games/${created.body.id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.statistics).toHaveLength(2);

    const list = await t.api().get('/rest/games').query({ season: 2024 });
    expect(list.status).toBe(200);
    expect(list.body.map((g: { number: number }) => g.number)).toContain(1);
  });

  it('calculates the score metadata, readable with GET', async () => {
    const created = await post(gameBody(playerIds, { number: 2 }));
    const { body } = await t.api().get(`/rest/games/${created.body.id}`);

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
    expect(bySeason.body).toHaveLength(1);

    const byNumber = await t
      .api()
      .get('/rest/games')
      .query({ season: 2023, number: 3 });
    expect(byNumber.body).toHaveLength(1);
  });

  it('updates a game with PATCH', async () => {
    const created = await post(gameBody(playerIds, { number: 4 }));
    const id = created.body.id;

    const res = await t
      .api()
      .patch(`/rest/games/${id}`)
      .set('Authorization', bearer(t))
      .send({
        ...gameBody(playerIds, { number: 4 }),
        id,
        description: 'edited',
      });

    expect(isSuccess(res.status)).toBe(true);

    const { body } = await t.api().get(`/rest/games/${id}`);
    expect(body.description).toBe('edited');
  });

  it('replaces a game with PUT', async () => {
    const created = await post(gameBody(playerIds, { number: 5 }));
    const id = created.body.id;

    const res = await t
      .api()
      .put(`/rest/games/${id}`)
      .set('Authorization', bearer(t))
      .send(gameBody(playerIds, { number: 5, description: 'replaced' }));

    expect(isSuccess(res.status)).toBe(true);

    const { body } = await t.api().get(`/rest/games/${id}`);
    expect(body.description).toBe('replaced');
  });

  it('deletes a game', async () => {
    const created = await post(gameBody(playerIds, { number: 6 }));
    const id = created.body.id;

    const res = await t
      .api()
      .delete(`/rest/games/${id}`)
      .set('Authorization', bearer(t));
    expect(isSuccess(res.status)).toBe(true);

    const after = await t
      .api()
      .get('/rest/games')
      .query({ season: 2024, number: 6 });
    expect(after.body).toHaveLength(0);
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
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.issues.length).toBeGreaterThan(0);
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

  describe('known defects of the current API (see the S11.9 audit)', () => {
    // it.fails passes while the defect exists and turns red once it is fixed:
    // then drop `.fails` to turn it into a regular regression test.

    // S3.12
    it.fails('a duplicate game answers 409, not 500', async () => {
      await post(gameBody(playerIds, { number: 20 }));
      const res = await post(gameBody(playerIds, { number: 20 }));

      expect(res.status).toBe(409);
    });

    // S3.12
    it.fails('deleting a missing game answers 404, not 500', async () => {
      const res = await t
        .api()
        .delete('/rest/games/64b7f0f0f0f0f0f0f0f0f0f0')
        .set('Authorization', bearer(t));

      expect(res.status).toBe(404);
    });

    // S3.12
    it.fails(
      'a game without a captain answers 400 and is not stored',
      async () => {
        const body = gameBody(playerIds, { number: 21 });
        body.statistics = body.statistics.map(s => ({
          ...s,
          isCaptain: false,
        }));

        const res = await post(body);
        const stored = await t
          .api()
          .get('/rest/games')
          .query({ season: 2024, number: 21 });

        expect(res.status).toBe(400);
        expect(stored.body).toHaveLength(0);
      },
    );

    // S3.11
    it.fails('the create response already contains metadata', async () => {
      const res = await post(gameBody(playerIds, { number: 22 }));

      expect(res.body.metadata.score).toEqual([2, 1]);
    });
  });
});
