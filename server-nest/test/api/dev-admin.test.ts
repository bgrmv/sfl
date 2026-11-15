import { afterEach, describe, expect, it } from 'vitest';

import { createTestApp, TestApp } from '../helpers/test-app';

// The development admin exists in local development, and nowhere else

const signIn = (t: TestApp) =>
  t
    .api()
    .post('/rest/auth/sign-in')
    .send({ email: 'admin@sfl.local', password: 'admin' });

// Every test starts a whole app on its own database: slower than the default 5 s under load
describe('development admin', { timeout: 30_000 }, () => {
  let t: TestApp;
  const before = process.env.NODE_ENV;
  afterEach(async () => {
    process.env.NODE_ENV = before;
    await t.close();
  });

  it('is created when STAGE is development, and can sign in as ADMIN', async () => {
    t = await createTestApp({ STAGE: 'development' });

    const res = await signIn(t);

    expect(res.status).toBe(201);
    const user = await t.model('User').findOne({ email: 'admin@sfl.local' });
    const role = await t.model('Role').findOne({ _id: user!.roles[0] });
    expect(role!.name).toBe('ADMIN');
  });

  it('is not created when STAGE is not development', async () => {
    t = await createTestApp({ STAGE: 'staging' });

    expect((await signIn(t)).status).toBe(401);
  });

  it('is never created in production, even with STAGE=development', async () => {
    process.env.NODE_ENV = 'production';
    t = await createTestApp({ STAGE: 'development' });

    expect(
      await t.model('User').exists({ email: 'admin@sfl.local' }),
    ).toBeNull();
  });

  it('does not touch an existing user: a changed password stays', async () => {
    t = await createTestApp({ STAGE: 'development' });
    await t
      .model('User')
      .updateOne({ email: 'admin@sfl.local' }, { password: 'changed' });

    await t.app
      .get(
        (await import('../../src/entities/auth/dev-admin.seeder'))
          .DevAdminSeeder,
      )
      .onApplicationBootstrap();

    const user = await t.model('User').findOne({ email: 'admin@sfl.local' });
    expect(user!.password).toBe('changed');
  });
});
