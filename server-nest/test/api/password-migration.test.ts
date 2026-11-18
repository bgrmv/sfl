import {
  createTestApp,
  TestApp,
  USER_EMAIL,
  USER_PASSWORD,
} from '../helpers/test-app';
import { sha512Legacy } from '../../src/shared/utils/string';

describe('API: SHA-512 passwords move to argon2id at sign-in (S8.7, ADR 0020)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());

  const signIn = (email: string, password: string) =>
    t.api().post('/rest/auth/sign-in').send({ email, password });
  const stored = () => t.model('User').findOne({ email: USER_EMAIL }).lean();
  const setLegacy = (password: string) =>
    t.model('User').updateOne(
      { email: USER_EMAIL },
      {
        $set: { password: sha512Legacy(password) },
        $unset: { passwordAlgorithm: '' },
      },
    );

  it('rehashes a legacy hash after a successful sign-in and marks the algorithm', async () => {
    await setLegacy(USER_PASSWORD);

    const res = await signIn(USER_EMAIL, USER_PASSWORD);

    expect(res.status).toBeLessThan(300);
    const user = await stored();
    expect(user.password).toMatch(/^\$argon2id\$/);
    expect(user.passwordAlgorithm).toBe('argon2id');
  });

  it('signs in again with the new hash and rejects a wrong password', async () => {
    expect((await signIn(USER_EMAIL, USER_PASSWORD)).status).toBeLessThan(300);
    expect((await signIn(USER_EMAIL, 'wrong-password')).status).toBe(401);
  });

  it('leaves a legacy hash alone after a wrong password', async () => {
    await setLegacy(USER_PASSWORD);

    expect((await signIn(USER_EMAIL, 'wrong-password')).status).toBe(401);

    const user = await stored();
    expect(user.password).toBe(sha512Legacy(USER_PASSWORD));
  });

  it('keeps the sessions open: the rehash is not a password change', async () => {
    await setLegacy(USER_PASSWORD);
    const before = (await stored()).tokenVersion ?? 0;

    await signIn(USER_EMAIL, USER_PASSWORD);

    expect((await stored()).tokenVersion ?? 0).toBe(before);
  });

  it('stores a password set by an admin as argon2id', async () => {
    const id = (await stored())._id.toString();

    const res = await t
      .api()
      .put(`/rest/users/${id}/password`)
      .set('Authorization', `Bearer ${t.token}`)
      .send({ password: 'brand-new-pass' });

    expect(res.status).toBeLessThan(300);
    const user = await stored();
    expect(user.password).toMatch(/^\$argon2id\$/);
    expect(user.passwordAlgorithm).toBe('argon2id');
    expect((await signIn(USER_EMAIL, 'brand-new-pass')).status).toBeLessThan(
      300,
    );
  });

  describe('POST /migrations/revoke-legacy-passwords', () => {
    const run = (body?: object, token = t.token) =>
      t
        .api()
        .post('/rest/migrations/revoke-legacy-passwords')
        .set('Authorization', `Bearer ${token}`)
        .send(body ?? {});

    it('counts the legacy hashes and writes nothing without apply', async () => {
      await setLegacy(USER_PASSWORD);

      const res = await run();

      expect(res.status).toBeLessThan(300);
      expect(res.body.data.applied).toBe(false);
      expect(res.body.data.legacy).toBeGreaterThanOrEqual(1);
      expect((await stored()).password).toBe(sha512Legacy(USER_PASSWORD));
    });

    it('with apply makes the legacy password unusable and ends the sessions', async () => {
      await setLegacy(USER_PASSWORD);
      const before = (await stored()).tokenVersion ?? 0;

      const res = await run({ apply: true });

      expect(res.status).toBeLessThan(300);
      expect(res.body.data.applied).toBe(true);
      expect((await signIn(USER_EMAIL, USER_PASSWORD)).status).toBe(401);
      const user = await stored();
      expect(user.passwordAlgorithm).toBe('argon2id');
      expect(user.tokenVersion).toBe(before + 1);
    });

    it('keeps an account that already moved to argon2id', async () => {
      await setLegacy(USER_PASSWORD);
      await signIn(USER_EMAIL, USER_PASSWORD);
      const moved = (await stored()).password;

      await run({ apply: true });

      expect((await stored()).password).toBe(moved);
      expect((await signIn(USER_EMAIL, USER_PASSWORD)).status).toBeLessThan(
        300,
      );
    });

    it('is closed to a plain user', async () => {
      expect((await run({}, t.userToken)).status).toBe(403);
    });
  });
});
