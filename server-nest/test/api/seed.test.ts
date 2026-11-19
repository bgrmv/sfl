import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHash } from 'node:crypto';

// .devcontainer/seed.cjs fills local and staging databases (S7.10)

const sha512 = (s: string) => createHash('sha-512').update(s).digest('hex');

describe('seed.cjs', { timeout: 60_000 }, () => {
  let mongo: MongoMemoryServer;
  let conn: any;

  beforeAll(async () => {
    process.env.SEED_ADMIN_EMAIL = 'owner@example.test';
    process.env.SEED_ADMIN_PASSWORD = 'a-long-staging-password';
    mongo = await MongoMemoryServer.create();
    const { mongoose } = createRequire(import.meta.url)(
      '../../../.devcontainer/db.cjs',
    );
    conn = await mongoose
      .createConnection(mongo.getUri(), { dbName: 'seed' })
      .asPromise();
  });
  afterAll(async () => {
    await conn.close();
    await mongo.stop();
  });

  const load = () =>
    createRequire(import.meta.url)('../../../.devcontainer/seed.cjs');

  it('takes the administrator from SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD', async () => {
    expect(await load().seed(conn.db, { log: () => {} })).toBe(true);

    const users = await conn.db.collection('users').find().toArray();
    expect(users.map((u: any) => u.email)).toContain('owner@example.test');
    expect(users.map((u: any) => u.email)).not.toContain('admin@sfl.local');
    const admin = users.find((u: any) => u.email === 'owner@example.test');
    expect(admin.password).toBe(sha512('a-long-staging-password'));
  });

  it('does nothing on a database that is not empty', async () => {
    const before = await conn.db.collection('users').countDocuments();

    expect(await load().seed(conn.db, { log: () => {} })).toBe(false);

    expect(await conn.db.collection('users').countDocuments()).toBe(before);
  });
});
