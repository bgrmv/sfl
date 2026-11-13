import { createTestApp, TestApp } from '../helpers/test-app';
import { bearer, createPlayers, isSuccess } from '../helpers/fixtures';

describe('API: players', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());

  const auth = () => ({ Authorization: bearer(t) });

  it('creates players together with their users', async () => {
    const res = await t
      .api()
      .post('/rest/players')
      .set(auth())
      .send([
        {
          nickname: 'Bomber',
          number: 9,
          user: { email: 'bomber@sfl.test', name: 'Gerd' },
        },
        { nickname: 'Keeper', number: 1, user: { email: 'keeper@sfl.test' } },
      ]);

    expect(isSuccess(res.status)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ nickname: 'Bomber', number: 9 });
    expect(res.body[0].user).toMatchObject({ email: 'bomber@sfl.test' });
  });

  it('returns a player by id and the list without metadata by default', async () => {
    const [player] = await createPlayers(t, 1);

    const byId = await t.api().get(`/rest/players/${player.id}`);
    expect(byId.status).toBe(200);
    expect(byId.body).toMatchObject({
      id: player.id,
      nickname: player.nickname,
    });

    const list = await t
      .api()
      .get('/rest/players')
      .query({ includeMetadata: false });
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);
    expect(list.body[0]).not.toHaveProperty('metadata');
  });

  it('filters the list by ids', async () => {
    const [a, b] = await createPlayers(t, 2);

    const res = await t
      .api()
      .get('/rest/players')
      .query({ ids: `${a.id},${b.id}`, includeMetadata: false });

    expect(res.body.map((p: { id: string }) => p.id).sort()).toEqual(
      [a.id, b.id].sort(),
    );
  });

  it('updates a player with PATCH', async () => {
    const [player] = await createPlayers(t, 1);
    const current = (await t.api().get(`/rest/players/${player.id}`)).body;

    const res = await t
      .api()
      .patch(`/rest/players/${player.id}`)
      .set(auth())
      .send({ nickname: 'Renamed', user: { id: current.user.id } });

    expect(isSuccess(res.status)).toBe(true);

    const after = await t.api().get(`/rest/players/${player.id}`);
    expect(after.body.nickname).toBe('Renamed');
  });

  it('deletes a player together with the user', async () => {
    const [player] = await createPlayers(t, 1);

    const res = await t.api().delete(`/rest/players/${player.id}`).set(auth());
    expect(isSuccess(res.status)).toBe(true);

    const list = await t
      .api()
      .get('/rest/players')
      .query({ ids: player.id, includeMetadata: false });
    expect(list.body).toHaveLength(0);
  });

  it('recalculates the season for the given players', async () => {
    const [player] = await createPlayers(t, 1);

    const res = await t
      .api()
      .post('/rest/players/recalculate/season')
      .set(auth())
      .send({ seasonId: 2024, playerIds: [player.id] });

    expect(isSuccess(res.status)).toBe(true);
    expect(res.body).toMatchObject({ success: 'OK', seasonId: 2024 });
  });

  describe('invalid body: 400', () => {
    it.each([
      ['no playerIds', { seasonId: 2024 }],
      ['empty playerIds', { seasonId: 2024, playerIds: [] }],
      ['season before 2010', { seasonId: 1999, playerIds: ['x'] }],
    ])('recalculate: %s', async (_name, body) => {
      const res = await t
        .api()
        .post('/rest/players/recalculate/season')
        .set(auth())
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('GET /players: includeMetadata is required to be a boolean', async () => {
      const res = await t
        .api()
        .get('/rest/players')
        .query({ includeMetadata: 'maybe' });

      expect(res.status).toBe(400);
    });

    it('GET /players/:id: an id that is only spaces', async () => {
      const res = await t.api().get('/rest/players/%20');

      expect(res.status).toBe(400);
    });
  });

  describe('known defects of the current API (see the S11.9 audit)', () => {
    // it.fails passes while the defect exists and turns red once it is fixed:
    // then drop `.fails` to turn it into a regular regression test.

    // S3.12: /players/captains is shadowed by /players/:id
    it.fails('GET /players/captains answers 200', async () => {
      const res = await t.api().get('/rest/players/captains');

      expect(res.status).toBe(200);
    });

    // S3.12
    it.fails(
      'a failed creation answers with an error status, not 201',
      async () => {
        const body = [
          { nickname: 'Twin', number: 7, user: { email: 'twin@sfl.test' } },
        ];
        await t.api().post('/rest/players').set(auth()).send(body);

        const duplicate = await t
          .api()
          .post('/rest/players')
          .set(auth())
          .send(body);

        expect(duplicate.status).toBeGreaterThanOrEqual(400);
      },
    );

    // S3.12
    it.fails('a missing player answers 404, not 500', async () => {
      const res = await t.api().get('/rest/players/64b7f0f0f0f0f0f0f0f0f0f0');

      expect(res.status).toBe(404);
    });

    // S8.9
    it.fails(
      'PATCH does not let change roles and password of the user',
      async () => {
        const [player] = await createPlayers(t, 1);
        const current = (await t.api().get(`/rest/players/${player.id}`)).body;

        await t
          .api()
          .patch(`/rest/players/${player.id}`)
          .set(auth())
          .send({
            nickname: player.nickname,
            user: { id: current.user.id, password: 'plain-text', roles: [] },
          });

        const stored = await t
          .model('User')
          .findOne({ email: current.user.email })
          .lean();
        expect(stored.password).not.toBe('plain-text');
      },
    );

    // S8.10
    it.fails('public GET /players does not expose emails', async () => {
      await createPlayers(t, 1);
      const res = await t
        .api()
        .get('/rest/players')
        .query({ includeMetadata: false });

      expect(JSON.stringify(res.body)).not.toContain('@sfl.test');
    });
  });
});
