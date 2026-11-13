import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  createTestApp,
  TestApp,
  USER_EMAIL,
} from '../helpers/test-app';
import { bearer } from '../helpers/fixtures';

describe('API: users, password change (S8.9)', () => {
  let t: TestApp;
  let userId: string;

  beforeAll(async () => {
    t = await createTestApp();
    userId = (
      await t.model('User').findOne({ email: USER_EMAIL }).lean()
    )._id.toString();
  });

  afterAll(() => t.close());

  const setPassword = (id: string, body: object, token = t.token) =>
    t
      .api()
      .post(`/rest/users/${id}/password`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const signIn = (email: string, password: string) =>
    t.api().post('/rest/auth/sign-in').send({ email, password });

  it('lets an admin set a password: stored hashed, the new one works', async () => {
    const res = await setPassword(userId, { password: 'brand-new-pass' });

    expect(res.status).toBeLessThan(300);

    const stored = await t.model('User').findOne({ email: USER_EMAIL }).lean();
    expect(stored.password).not.toBe('brand-new-pass');
    expect((await signIn(USER_EMAIL, 'brand-new-pass')).status).toBeLessThan(
      300,
    );
    expect((await signIn(USER_EMAIL, 'user-password')).status).toBe(401);
  });

  it('answers 403 to a plain user, even for their own id', async () => {
    const res = await setPassword(
      userId,
      { password: 'another-pass-1' },
      t.userToken,
    );

    expect(res.status).toBe(403);
  });

  it.each([
    ['too short', { password: 'short' }],
    ['missing', {}],
    ['not a string', { password: 12345678 }],
  ])('answers 400: %s', async (_name, body) => {
    expect((await setPassword(userId, body)).status).toBe(400);
  });

  it('answers 404 for an unknown user and 400 for a broken id', async () => {
    const unknown = '11111111-1111-4111-8111-111111111111';

    expect(
      (await setPassword(unknown, { password: 'long-enough-1' })).status,
    ).toBe(404);
    expect(
      (await setPassword('nope', { password: 'long-enough-1' })).status,
    ).toBe(400);
  });

  it('keeps the admin password untouched', async () => {
    expect((await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)).status).toBeLessThan(
      300,
    );
    expect(bearer(t)).toContain('Bearer');
  });
});
