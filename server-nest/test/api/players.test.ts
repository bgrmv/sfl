import { createTestApp, TestApp } from '../helpers/test-app';
import {
  bearer,
  createPlayers,
  gameBody,
  isSuccess,
} from '../helpers/fixtures';

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
    const current = (
      await t.api().get(`/rest/players/${player.id}`).set(auth())
    ).body;

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

  describe('PATCH /players/:id: only whitelisted fields (S8.9)', () => {
    const patch = (id: string, body: object) =>
      t.api().patch(`/rest/players/${id}`).set(auth()).send(body);

    const storedUser = (email: string) =>
      t.model('User').findOne({ email }).lean();

    it('does not change password, roles and unknown fields of the user', async () => {
      const [player] = await createPlayers(t, 1);
      const current = (
        await t.api().get(`/rest/players/${player.id}`).set(auth())
      ).body;
      const before = await storedUser(current.user.email);

      const res = await patch(player.id, {
        nickname: 'Whitelisted',
        user: {
          id: current.user.id,
          name: 'Changed',
          password: 'plain-text',
          roles: [],
          isAdmin: true,
        },
        metadata: { hacked: true },
      });

      expect(isSuccess(res.status)).toBe(true);
      const after = await storedUser(current.user.email);
      expect(after.name).toBe('Changed');
      expect(after.password).toBe(before.password);
      expect(after.roles).toEqual(before.roles);
      expect(after).not.toHaveProperty('isAdmin');

      const stored = await t.model('Player').findById(player.id).lean();
      expect(stored.nickname).toBe('Whitelisted');
      expect(JSON.stringify(stored.metadata ?? {})).not.toContain('hacked');
    });

    it('takes the user from the player, not from the body', async () => {
      const [a, b] = await createPlayers(t, 2);
      const userB = (await t.api().get(`/rest/players/${b.id}`).set(auth()))
        .body.user;

      await patch(a.id, { user: { id: userB.id, name: 'Intruder' } });

      const after = await t.api().get(`/rest/players/${b.id}`).set(auth());
      expect(after.body.user.name).not.toBe('Intruder');
    });

    it('answers 404 for a missing player and 400 for a broken id', async () => {
      expect(
        (await patch('64b7f0f0f0f0f0f0f0f0f0f0', { nickname: 'x' })).status,
      ).toBe(404);
      expect((await patch('not-an-id', { nickname: 'x' })).status).toBe(400);
    });

    it.each([
      ['empty nickname', { nickname: '' }],
      ['number out of range', { number: 0 }],
      ['unknown status', { status: 'FLYING' }],
      ['invalid email', { user: { email: 'not-an-email' } }],
    ])('answers 400: %s', async (_name, body) => {
      const [player] = await createPlayers(t, 1);

      expect((await patch(player.id, body)).status).toBe(400);
    });
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

  describe('personal data is not public (S8.10)', () => {
    let playerId: string;

    beforeAll(async () => {
      const [a, b] = await createPlayers(t, 2);
      playerId = a.id;
      // a game with goals gives both players season points for the charts
      await t
        .api()
        .post('/rest/games')
        .set(auth())
        .send(gameBody([a.id, b.id], { number: 30, season: 2022 }));
    });

    const PERSONAL = ['@sfl.test', 'Secret'];
    const expectNoPersonalData = (body: unknown) => {
      const text = JSON.stringify(body);
      for (const value of PERSONAL) expect(text).not.toContain(value);
    };

    const publicRoutes = () => [
      '/rest/players?includeMetadata=false',
      `/rest/players/${playerId}`,
      '/rest/charts/top-total-points-players?season=2022',
      '/rest/charts/top-ancient-rating-system-players?season=2022',
    ];

    it.each([0, 1, 2, 3])(
      'public route #%i has no email and surname',
      async i => {
        const res = await t.api().get(publicRoutes()[i]);

        expect(res.status).toBe(200);
        expectNoPersonalData(res.body);
      },
    );

    it('charts still have the data needed for the labels', async () => {
      const res = await t
        .api()
        .get('/rest/charts/top-total-points-players?season=2022');

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toMatchObject({
        nickname: expect.any(String),
        user: { name: 'Test' },
      });
    });

    it('a public player keeps the nickname, number and the first name', async () => {
      const { body } = await t.api().get(`/rest/players/${playerId}`);

      expect(body).toMatchObject({ id: playerId, user: { name: 'Test' } });
      expect(body.user).not.toHaveProperty('email');
      expect(body.user).not.toHaveProperty('id');
    });

    it('a garbage token does not break a public route and gives no personal data', async () => {
      const res = await t
        .api()
        .get('/rest/players?includeMetadata=false')
        .set('Authorization', 'Bearer garbage');

      expect(res.status).toBe(200);
      expectNoPersonalData(res.body);
    });

    it('a plain USER gets no personal data either', async () => {
      const res = await t
        .api()
        .get(`/rest/players/${playerId}`)
        .set('Authorization', `Bearer ${t.userToken}`);

      expectNoPersonalData(res.body);
    });

    it('an ADMIN gets the full user, without the password and roles', async () => {
      const res = await t.api().get(`/rest/players/${playerId}`).set(auth());

      expect(res.body.user).toMatchObject({
        email: expect.stringContaining('@sfl.test'),
        surname: 'Secret',
        id: expect.any(String),
      });
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('roles');

      const list = await t
        .api()
        .get('/rest/players?includeMetadata=false')
        .set(auth());
      expect(JSON.stringify(list.body)).toContain('@sfl.test');
    });

    it('an ADMIN with only the refresh cookie gets the full user too', async () => {
      const signIn = await t
        .api()
        .post('/rest/auth/sign-in')
        .send({ email: 'admin@sfl.test', password: 'admin-password' });

      const res = await t
        .api()
        .get(`/rest/players/${playerId}`)
        .set('Cookie', signIn.headers['set-cookie']);

      expect(res.body.user.email).toContain('@sfl.test');
    });
  });

  describe('statuses and all-or-nothing creation (S3.12)', () => {
    const MISSING = '64b7f0f0f0f0f0f0f0f0f0f0';
    const create = (body: unknown) =>
      t
        .api()
        .post('/rest/players')
        .set(auth())
        .send(body as object);
    const person = (n: string) => ({
      nickname: `Nick ${n}`,
      number: 5,
      user: { email: `${n}@sfl.test` },
    });

    it('GET /players/captains answers 200 with the captains only', async () => {
      const [a, b] = await createPlayers(t, 2);
      await t.api().patch(`/rest/players/${a.id}`).set(auth()).send({
        isCaptain: true,
      });

      const res = await t.api().get('/rest/players/captains');

      expect(res.status).toBe(200);
      const ids = res.body.map((p: { id: string }) => p.id);
      expect(ids).toContain(a.id);
      expect(ids).not.toContain(b.id);
    });

    it('a missing player answers 404, a broken id 400', async () => {
      expect((await t.api().get(`/rest/players/${MISSING}`)).status).toBe(404);
      expect((await t.api().get('/rest/players/not-an-id')).status).toBe(400);
      expect(
        (await t.api().delete('/rest/players/not-an-id').set(auth())).status,
      ).toBe(400);
      expect(
        (await t.api().delete(`/rest/players/${MISSING}`).set(auth())).status,
      ).toBe(404);
    });

    it('a duplicate email answers 409, not 201', async () => {
      await create([person('twin')]);
      const res = await create([person('twin')]);

      expect(res.status).toBe(409);
    });

    it('a failed batch creates nobody: the first record is rolled back', async () => {
      await create([person('taken')]);

      const res = await create([person('fresh'), person('taken')]);

      expect(res.status).toBe(409);
      expect(
        await t.model('User').countDocuments({ email: 'fresh@sfl.test' }),
      ).toBe(0);
      expect(
        await t.model('Player').countDocuments({ nickname: 'Nick fresh' }),
      ).toBe(0);
    });

    it('the same email twice in one request answers 409 before anything is created', async () => {
      const res = await create([person('dup'), person('dup')]);

      expect(res.status).toBe(409);
      expect(
        await t.model('User').countDocuments({ email: 'dup@sfl.test' }),
      ).toBe(0);
    });

    it.each([
      ['an empty list', []],
      ['not a list', { nickname: 'x' }],
      ['no user', [{ nickname: 'x', number: 1 }]],
      ['an invalid email', [{ nickname: 'x', user: { email: 'nope' } }]],
      ['an empty nickname', [{ nickname: '', user: { email: 'a@b.co' } }]],
    ])('POST /players: %s answers 400', async (_name, body) => {
      const res = await create(body);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('GET /players?ids=bad answers 400', async () => {
      const res = await t.api().get('/rest/players').query({ ids: 'bad,ids' });

      expect(res.status).toBe(400);
    });

    it('GET /players works without includeMetadata', async () => {
      const res = await t.api().get('/rest/players');

      expect(res.status).toBe(200);
    });

    it('a player with games cannot be deleted: 409, the records stay', async () => {
      const [a, b] = await createPlayers(t, 2);
      await t
        .api()
        .post('/rest/games')
        .set(auth())
        .send(gameBody([a.id, b.id], { number: 31, season: 2021 }));

      const res = await t.api().delete(`/rest/players/${a.id}`).set(auth());

      expect(res.status).toBe(409);
      expect((await t.api().get(`/rest/players/${a.id}`)).status).toBe(200);
    });

    it('PATCH of a taken email answers 409', async () => {
      const [a, b] = await createPlayers(t, 2);
      const other = (await t.api().get(`/rest/players/${b.id}`).set(auth()))
        .body.user.email;

      const res = await t
        .api()
        .patch(`/rest/players/${a.id}`)
        .set(auth())
        .send({ user: { email: other } });

      expect(res.status).toBe(409);
    });

    it('every error has the same shape: statusCode and message', async () => {
      const responses = await Promise.all([
        t.api().get('/rest/players/not-an-id'),
        t.api().get(`/rest/players/${MISSING}`),
        t.api().post('/rest/players').set(auth()).send([]),
        t.api().post('/rest/players'),
        t
          .api()
          .post('/rest/players')
          .set('Authorization', `Bearer ${t.userToken}`),
        create([person('twin')]),
      ]);

      expect(responses.map(r => r.status)).toEqual([
        400, 404, 400, 401, 403, 409,
      ]);
      for (const { status, body } of responses) {
        expect(body).toMatchObject({
          statusCode: status,
          message: expect.anything(),
        });
      }
    });
  });
});
