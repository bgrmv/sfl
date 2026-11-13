import { JwtService } from '@nestjs/jwt';
import {
  createTestApp,
  TestApp,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from '../helpers/test-app';
import {
  bearer,
  createPlayers,
  gameBody,
  isSuccess,
} from '../helpers/fixtures';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface Target {
  gameId: string;
  playerId: string;
  /** A player without games: the only kind that can be deleted. */
  freePlayerId: string;
  userId: string;
  playerIds: [string, string];
}

interface Case {
  name: string;
  method: Method;
  path: (t: Target) => string;
  body?: (t: Target) => object;
  /** Any signed-in user may call it; otherwise only ADMIN. */
  anyRole?: boolean;
}

// Every route that changes data, plus the protected reads. A new route must be
// added here, otherwise the completeness test below fails.
const CLOSED: Case[] = [
  {
    name: 'POST /games',
    method: 'post',
    path: () => '/games',
    body: t => gameBody(t.playerIds, { number: 40 }),
  },
  {
    name: 'PATCH /games/:id',
    method: 'patch',
    path: t => `/games/${t.gameId}`,
    body: t => ({ ...gameBody(t.playerIds, { number: 41 }), id: t.gameId }),
  },
  {
    name: 'PUT /games/:id',
    method: 'put',
    path: t => `/games/${t.gameId}`,
    body: t => gameBody(t.playerIds, { number: 42 }),
  },
  {
    name: 'DELETE /games/:id',
    method: 'delete',
    path: t => `/games/${t.gameId}`,
  },
  {
    name: 'POST /players',
    method: 'post',
    path: () => '/players',
    body: () => [
      { nickname: 'Matrix', number: 77, user: { email: 'matrix@sfl.test' } },
    ],
  },
  {
    name: 'PATCH /players/:id',
    method: 'patch',
    path: t => `/players/${t.playerId}`,
    body: t => ({ nickname: 'Matrix', user: { id: t.userId } }),
  },
  {
    name: 'DELETE /players/:id',
    method: 'delete',
    path: t => `/players/${t.freePlayerId}`,
  },
  {
    name: 'POST /players/recalculate/season',
    method: 'post',
    path: () => '/players/recalculate/season',
    body: t => ({ seasonId: 2024, playerIds: [t.playerId] }),
  },
  {
    name: 'POST /teams',
    method: 'post',
    path: () => '/teams',
    body: () => ({
      name: 'Matrix team',
      color: 'RED',
      description: null,
      logo: null,
    }),
  },
  {
    name: 'PUT /teams/:id',
    method: 'put',
    path: () => '/teams/some-id',
    body: () => ({}),
  },
  {
    name: 'POST /roles',
    method: 'post',
    path: () => '/roles',
    body: () => ({ name: 'TEST' }),
  },
  { name: 'GET /users', method: 'get', path: () => '/users' },
  {
    name: 'POST /users/test-users',
    method: 'post',
    path: () => '/users/test-users',
    body: () => ({ size: '3' }),
  },
  {
    name: 'POST /migrations/convert-players-user-to-uuid',
    method: 'post',
    path: () => '/migrations/convert-players-user-to-uuid',
  },
  {
    name: 'POST /users/:id/password',
    method: 'post',
    path: t => `/users/${t.userId}/password`,
    body: () => ({ password: 'new-password-1' }),
  },
  {
    name: 'GET /auth/whoami',
    method: 'get',
    path: () => '/auth/whoami',
    anyRole: true,
  },
];

const PUBLIC = [
  'POST /auth/sign-in',
  'POST /auth/sign-out',
  'GET /games',
  'GET /games/:id',
  'GET /players',
  'GET /players/:id',
  'GET /players/captains',
  'GET /teams',
  'GET /charts/top-total-points-players',
  'GET /charts/top-ancient-rating-system-players',
];

describe('API: access matrix', () => {
  let t: TestApp;
  let jwt: JwtService;

  beforeAll(async () => {
    t = await createTestApp();
    jwt = t.app.get(JwtService);
  });

  afterAll(() => t.close());

  /** Fresh records for every case, so that DELETE does not break the next one. */
  async function target(): Promise<Target> {
    const [a, b, free] = await createPlayers(t, 3);
    const game = await t
      .api()
      .post('/rest/games')
      .set('Authorization', bearer(t))
      .send(
        gameBody([a.id, b.id], {
          number: 10 + Math.floor(Math.random() * 20),
          season: 2000 + Math.floor(Math.random() * 1000),
        }),
      );
    const player = (
      await t.api().get(`/rest/players/${a.id}`).set('Authorization', bearer(t))
    ).body;

    return {
      gameId: game.body.id,
      playerId: a.id,
      freePlayerId: free.id,
      userId: player.user.id,
      playerIds: [a.id, b.id],
    };
  }

  const send = (c: Case, tg: Target, headers: Record<string, string> = {}) => {
    const req = t
      .api()
      [c.method](`/rest${c.path(tg)}`)
      .set(headers);
    return c.body ? req.send(c.body(tg)) : req;
  };

  it.each(CLOSED.map(c => [c.name, c] as const))(
    '%s: 401 without a token',
    async (_name, c) => {
      const res = await send(c, await target());

      expect(res.status).toBe(401);
    },
  );

  it.each(CLOSED.map(c => [c.name, c] as const))(
    '%s: success with a token',
    async (_name, c) => {
      const res = await send(c, await target(), { Authorization: bearer(t) });

      expect(isSuccess(res.status), `${c.name} answered ${res.status}`).toBe(
        true,
      );
    },
  );

  it.each(CLOSED.map(c => [c.name, c] as const))(
    '%s: a plain USER gets 403 (200 where any role is allowed)',
    async (_name, c) => {
      const res = await send(c, await target(), {
        Authorization: `Bearer ${t.userToken}`,
      });

      expect(res.status).toBe(c.anyRole ? 200 : 403);
    },
  );

  it('a plain USER changes nothing: the records are still there', async () => {
    const tg = await target();
    const headers = { Authorization: `Bearer ${t.userToken}` };

    await t.api().delete(`/rest/players/${tg.playerId}`).set(headers);
    await t.api().delete(`/rest/games/${tg.gameId}`).set(headers);
    await t
      .api()
      .patch(`/rest/players/${tg.playerId}`)
      .set(headers)
      .send({ nickname: 'hacked' });

    const player = await t.api().get(`/rest/players/${tg.playerId}`);
    const game = await t.api().get(`/rest/games/${tg.gameId}`);
    expect(player.body.nickname).not.toBe('hacked');
    expect(game.body).toMatchObject({ id: tg.gameId });
  });

  it('the matrix covers every route that is not public', () => {
    const covered = CLOSED.map(c => c.name);
    const router = (
      t.app.getHttpServer()._events.request.router as { stack: any[] }
    ).stack.flatMap(layer =>
      layer.route
        ? [layer.route]
        : (layer.handle?.stack?.map((l: any) => l.route).filter(Boolean) ?? []),
    );

    // Only the API: serve-static adds its own catch-all route for `public/`
    const all = router
      .filter((r: any) => r.path.startsWith('/rest'))
      .flatMap((r: any) =>
        Object.keys(r.methods).map(
          m => `${m.toUpperCase()} ${r.path.replace(/^\/rest/, '')}`,
        ),
      );
    const closed = all.filter((route: string) => !PUBLIC.includes(route));

    expect(closed.sort()).toEqual(covered.sort());
  });

  it.each(PUBLIC)('%s: is reachable without a token', async route => {
    const [method, path] = route.split(' ');
    const res = await t
      .api()
      [method.toLowerCase() as Method](
        `/rest${path.replace(':id', '64b7f0f0f0f0f0f0f0f0f0f0')}`,
      );

    expect(res.status).not.toBe(401);
  });

  describe('tokens', () => {
    const open = (headers: Record<string, string>) =>
      t.api().get('/rest/auth/whoami').set(headers);

    it('whoami returns the user of the token', async () => {
      const res = await open({ Authorization: bearer(t) });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: ADMIN_EMAIL, roles: ['ADMIN'] });
    });

    it('rejects a garbage token', async () => {
      expect((await open({ Authorization: 'Bearer garbage' })).status).toBe(
        401,
      );
    });

    it('rejects a token signed with another secret', async () => {
      const forged = await jwt.signAsync(
        { email: ADMIN_EMAIL },
        { secret: 'not-the-secret', algorithm: 'HS512' },
      );

      expect((await open({ Authorization: `Bearer ${forged}` })).status).toBe(
        401,
      );
    });

    it('rejects an expired token', async () => {
      const expired = await jwt.signAsync(
        { email: ADMIN_EMAIL },
        { secret: 'test-access-secret', expiresIn: '-10s' },
      );

      expect((await open({ Authorization: `Bearer ${expired}` })).status).toBe(
        401,
      );
    });

    it('lets a valid refresh cookie replace an expired access token', async () => {
      const signIn = await t
        .api()
        .post('/rest/auth/sign-in')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      const cookie = signIn.headers['set-cookie'];
      expect(String(cookie)).toContain('refreshToken=');
      expect(String(cookie)).toContain('HttpOnly');

      const res = await t.api().get('/rest/auth/whoami').set('Cookie', cookie);

      expect(res.status).toBe(200);
    });
  });

  describe('sign-in and sign-out', () => {
    it('answers 401 for a wrong password', async () => {
      const res = await t
        .api()
        .post('/rest/auth/sign-in')
        .send({ email: ADMIN_EMAIL, password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('answers 401 for an unknown email', async () => {
      const res = await t
        .api()
        .post('/rest/auth/sign-in')
        .send({ email: 'nobody@sfl.test', password: 'x' });

      expect(res.status).toBe(401);
    });

    it('answers 400 for a body without a password', async () => {
      const res = await t
        .api()
        .post('/rest/auth/sign-in')
        .send({ email: ADMIN_EMAIL });

      expect(res.status).toBe(400);
    });

    it('sign-out clears the refresh cookie', async () => {
      const res = await t.api().post('/rest/auth/sign-out');

      expect(isSuccess(res.status)).toBe(true);
      expect(res.body).toEqual({ accessToken: null });
      const cookie = String(res.headers['set-cookie']);
      const expires = new Date(/Expires=([^;]+)/.exec(cookie)![1]);
      expect(expires.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });
  });

  describe('invalid body with a valid token: 400', () => {
    it('POST /teams', async () => {
      const res = await t
        .api()
        .post('/rest/teams')
        .set('Authorization', bearer(t))
        .send({ name: 'x' });

      expect(res.status).toBe(400);
    });
  });
});
