import { createRequire } from 'node:module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { verifyPassword } from '../../src/shared/utils/password';

// .devcontainer/rotate-admin.cjs replaces the seeded administrator in place (S7.10)

const req = createRequire(import.meta.url);

describe('rotate-admin.cjs', { timeout: 60_000 }, () => {
  let mongo: MongoMemoryServer;
  let conn: any;
  const load = () => req('../../../.devcontainer/rotate-admin.cjs');
  const NEW = {
    from: 'admin@sfl.local',
    to: 'owner@example.test',
    password: 'a-long-staging-password',
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const { mongoose } = req('../../../.devcontainer/db.cjs');
    conn = await mongoose
      .createConnection(mongo.getUri(), { dbName: 'rot' })
      .asPromise();
    const seed = req('../../../.devcontainer/seed.cjs');
    await seed.seed(conn.db, { log: () => {} });
    const admin = await conn.db
      .collection('users')
      .findOne({ email: 'admin@sfl.local' });
    await conn.db.collection('sessions').insertMany([
      {
        _id: 's1',
        userId: String(admin._id),
        jti: 'a',
        rotatedAt: new Date(),
        expiresAt: new Date(Date.now() + 1e6),
      },
      {
        _id: 's2',
        userId: 'someone-else',
        jti: 'b',
        rotatedAt: new Date(),
        expiresAt: new Date(Date.now() + 1e6),
      },
    ]);
  });
  afterAll(async () => {
    await conn.close();
    await mongo.stop();
  });

  it('refuses a short password and changes nothing', async () => {
    await expect(
      load().rotateAdmin(conn.db, { ...NEW, password: 'short' }),
    ).rejects.toThrow(/shorter/);
    expect(
      await conn.db.collection('users').findOne({ email: 'admin@sfl.local' }),
    ).not.toBeNull();
  });

  it('replaces the email and the password, closes the sessions of the admin only, drops nothing', async () => {
    const before = await conn.db.collection('users').countDocuments();

    expect(await load().rotateAdmin(conn.db, NEW)).toBe(1);

    const users = conn.db.collection('users');
    expect(await users.countDocuments()).toBe(before);
    expect(await users.findOne({ email: 'admin@sfl.local' })).toBeNull();
    const admin = await users.findOne({ email: NEW.to });
    expect(admin.passwordAlgorithm).toBe('argon2id');
    expect(admin.tokenVersion).toBe(1);
    expect(await verifyPassword(admin.password, NEW.password)).toBe(true);
    expect(await verifyPassword(admin.password, 'admin')).toBe(false);
    expect(
      (await conn.db.collection('sessions').find().toArray()).map(
        (s: any) => s._id,
      ),
    ).toEqual(['s2']);
  });

  it('does nothing when the old admin is gone', async () => {
    await expect(
      load().rotateAdmin(conn.db, { ...NEW, to: 'other@example.test' }),
    ).rejects.toThrow(/not found/);
  });

  it('changes only the password when the email stays the same', async () => {
    await conn.db.collection('sessions').insertOne({
      _id: 's3',
      userId: String(
        (await conn.db.collection('users').findOne({ email: NEW.to }))._id,
      ),
      jti: 'c',
      rotatedAt: new Date(),
      expiresAt: new Date(Date.now() + 1e6),
    });

    const closed = await load().rotateAdmin(conn.db, {
      from: NEW.to,
      to: NEW.to,
      password: 'another-long-password-1',
    });

    expect(closed).toBe(1);
    const admin = await conn.db.collection('users').findOne({ email: NEW.to });
    expect(admin.tokenVersion).toBe(2);
    expect(
      await verifyPassword(admin.password, 'another-long-password-1'),
    ).toBe(true);
    expect(await verifyPassword(admin.password, NEW.password)).toBe(false);
  });
});
