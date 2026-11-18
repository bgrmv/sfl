import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  createTestApp,
  TEST_ACCESS_SECRET,
  TEST_REFRESH_SECRET,
  TestApp,
  USER_EMAIL,
  USER_PASSWORD,
} from '../helpers/test-app';
import { sha512Legacy } from '../../src/shared/utils/string';

// S8.12: sessions and tokens

const jwt = new JwtService();

describe('sessions', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const signIn = (email = ADMIN_EMAIL, password = ADMIN_PASSWORD) =>
    t.api().post('/rest/auth/sign-in').send({ email, password });
  const refreshCookie = (res: { headers: Record<string, any> }) =>
    String(res.headers['set-cookie']).split(';')[0];
  // The refresh cookie opens one route: it gives a new access token and the user
  const refresh = (cookie: string) =>
    t.api().post('/rest/auth/refresh').set('Cookie', cookie);

  describe('sign-out', () => {
    it('voids the refresh token: the old cookie answers 401 afterwards', async () => {
      const cookie = refreshCookie(await signIn());
      expect((await refresh(cookie)).status).toBe(201);

      await t.api().post('/rest/auth/sign-out').set('Cookie', cookie);

      expect((await refresh(cookie)).status).toBe(401);
    });

    it('ends the session of this device only', async () => {
      const phone = refreshCookie(await signIn(USER_EMAIL, USER_PASSWORD));
      const laptop = refreshCookie(await signIn(USER_EMAIL, USER_PASSWORD));

      await t.api().post('/rest/auth/sign-out').set('Cookie', laptop);

      expect((await refresh(laptop)).status).toBe(401);
      expect((await refresh(phone)).status).toBe(201);
    });

    it('does not end the sessions of other users', async () => {
      const admin = refreshCookie(await signIn());
      const user = refreshCookie(await signIn(USER_EMAIL, USER_PASSWORD));

      await t.api().post('/rest/auth/sign-out').set('Cookie', user);

      expect((await refresh(admin)).status).toBe(201);
    });

    it('answers 200 without a cookie and with a garbage cookie', async () => {
      expect((await t.api().post('/rest/auth/sign-out')).status).toBeLessThan(
        300,
      );
      expect(
        (
          await t
            .api()
            .post('/rest/auth/sign-out')
            .set('Cookie', 'refreshToken=garbage')
        ).status,
      ).toBeLessThan(300);
    });
  });

  it('a new password voids the old sessions', async () => {
    // A user of its own: the others keep their passwords for the other tests
    const role = await t.model('Role').findOne({ name: 'USER' });
    const user = await t.model('User').create({
      email: 'changer@sfl.test',
      name: 'Changer',
      password: sha512Legacy('old-password'),
      roles: [role!._id],
    });
    const cookie = refreshCookie(
      await signIn('changer@sfl.test', 'old-password'),
    );
    expect((await refresh(cookie)).status).toBe(201);

    const res = await t
      .api()
      .put(`/rest/users/${user._id}/password`)
      .set('Authorization', `Bearer ${t.token}`)
      .send({ password: 'a-brand-new-password' });
    expect(res.status).toBeLessThan(300);

    expect((await refresh(cookie)).status).toBe(401);
  });

  it('takes the roles from the database on a refresh: a role change works at once', async () => {
    const cookie = refreshCookie(await signIn(USER_EMAIL, USER_PASSWORD));
    expect((await refresh(cookie)).body.data.user.roles).toEqual(['USER']);

    const admin = await t.model('Role').findOne({ name: 'ADMIN' });
    await t
      .model('User')
      .updateOne({ email: USER_EMAIL }, { roles: [admin!._id] });

    const after = await refresh(cookie);
    expect(after.body.data.user.roles).toEqual(['ADMIN']);

    // and the other way round, so that the next tests find the user as before
    const role = await t.model('Role').findOne({ name: 'USER' });
    await t
      .model('User')
      .updateOne({ email: USER_EMAIL }, { roles: [role!._id] });
  });

  describe('tokens', () => {
    it('hold only the id, the roles and the version', async () => {
      const { accessToken } = (await signIn()).body.data;
      const payload: Record<string, unknown> = jwt.decode(accessToken);

      expect(Object.keys(payload).sort()).toEqual(
        ['_id', 'aud', 'exp', 'iat', 'iss', 'roles', 'tv'].sort(),
      );
      expect(payload).not.toHaveProperty('email');
    });

    it('whoami gives the rest of the user', async () => {
      const { accessToken } = (await signIn()).body.data;
      const res = await t
        .api()
        .get('/rest/auth/whoami')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.body.data).toMatchObject({
        email: ADMIN_EMAIL,
        roles: ['ADMIN'],
      });
    });

    it('a refresh token is not an access token and the other way round', async () => {
      const signed = await signIn();
      const refreshToken = refreshCookie(signed).replace('refreshToken=', '');
      const { accessToken } = signed.body.data;

      const asBearer = await t
        .api()
        .get('/rest/auth/whoami')
        .set('Authorization', `Bearer ${refreshToken}`);
      const asCookie = await refresh(`refreshToken=${accessToken}`);

      expect(asBearer.status).toBe(401);
      expect(asCookie.status).toBe(401);
    });

    const claims = { _id: 'x', roles: ['ADMIN'], tv: 0 };
    it.each([
      [
        'another algorithm (HS256)',
        { algorithm: 'HS256', issuer: 'sfl-api', audience: 'sfl-access' },
      ],
      [
        'another issuer',
        { algorithm: 'HS512', issuer: 'someone', audience: 'sfl-access' },
      ],
      [
        'another audience',
        { algorithm: 'HS512', issuer: 'sfl-api', audience: 'sfl-refresh' },
      ],
      ['no issuer and audience', { algorithm: 'HS512' }],
    ] as const)('rejects a token with %s', async (_name, options) => {
      const token = await jwt.signAsync(claims, {
        secret: TEST_ACCESS_SECRET,
        ...options,
      });

      const res = await t
        .api()
        .get('/rest/auth/whoami')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('rejects an unsigned token (alg none)', async () => {
      const part = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url');
      const token = `${part({ alg: 'none', typ: 'JWT' })}.${part({
        ...claims,
        iss: 'sfl-api',
        aud: 'sfl-access',
      })}.`;

      const res = await t
        .api()
        .get('/rest/auth/whoami')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('rejects a refresh token of another version (a password change)', async () => {
      const cookie = refreshCookie(await signIn(USER_EMAIL, USER_PASSWORD));
      await t
        .model('User')
        .updateOne({ email: USER_EMAIL }, { $inc: { tokenVersion: 1 } });

      expect((await refresh(cookie)).status).toBe(401);
    });
  });

  describe('rotation of the refresh token', () => {
    const jti = (cookie: string) =>
      (jwt.decode(cookie.replace('refreshToken=', '')) as { jti: string }).jti;

    it('gives a new refresh token at every refresh, and the session stays', async () => {
      const first = refreshCookie(await signIn());
      const res = await refresh(first);
      const second = refreshCookie(res);

      expect(res.status).toBe(201);
      expect(second).not.toBe(first);
      expect(jti(second)).not.toBe(jti(first));
      expect((await refresh(second)).status).toBe(201);
    });

    it('a replaced token used again after the grace time kills the whole session', async () => {
      const stolen = refreshCookie(await signIn());
      const newest = refreshCookie(await refresh(stolen));

      // The grace time of the previous token is over
      await t
        .model('Session')
        .updateMany({}, { rotatedAt: new Date(Date.now() - 60_000) });

      expect((await refresh(stolen)).status).toBe(401);
      // The owner is out as well: he signs in again, the thief has nothing
      expect((await refresh(newest)).status).toBe(401);
    });

    it('lets the previous token through for a few seconds, without a new cookie (two tabs)', async () => {
      const first = refreshCookie(await signIn());
      const newest = refreshCookie(await refresh(first));

      const twin = await refresh(first);

      expect(twin.status).toBe(201);
      expect(twin.body.data.accessToken).toBeTruthy();
      expect(twin.headers['set-cookie']).toBeUndefined();
      // the cookie of the first refresh is still the current one
      expect((await refresh(newest)).status).toBe(201);
    });

    it('does not touch the sessions of other devices when one is stolen', async () => {
      const phone = refreshCookie(await signIn());
      const stolen = refreshCookie(await signIn());
      await refresh(stolen);
      await t
        .model('Session')
        .updateMany({}, { rotatedAt: new Date(Date.now() - 60_000) });

      expect((await refresh(stolen)).status).toBe(401);
      expect((await refresh(phone)).status).toBe(201);
    });

    it('rejects a refresh token of a session that does not exist', async () => {
      const cookie = refreshCookie(await signIn());
      await t.model('Session').deleteMany({});

      expect((await refresh(cookie)).status).toBe(401);
    });
  });

  describe('cookie', () => {
    it('is HttpOnly and SameSite, and not Secure in the local stage', async () => {
      const cookie = String((await signIn()).headers['set-cookie']);

      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/rest/auth');
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(cookie).not.toContain('Secure');
    });
  });
});

describe('cookie outside the local development', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ STAGE: 'production' });
  });
  afterAll(() => t.close());

  it('is Secure, on sign-in and on sign-out alike', async () => {
    const signIn = await t
      .api()
      .post('/rest/auth/sign-in')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const signOut = await t.api().post('/rest/auth/sign-out');

    expect(String(signIn.headers['set-cookie'])).toContain('Secure');
    expect(String(signOut.headers['set-cookie'])).toContain('Secure');
  });
});
