import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, TestApp } from '../helpers/test-app';

// ADR 0014: the test database is a replica set, so a multi-document write can be one transaction
describe('transactions on the replica set', () => {
  let t: TestApp;
  const name = 'transaction_probe';

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  const connection = () => t.app.get<Connection>(getConnectionToken());
  const probe = () => connection().collection(name);

  it('commits both writes', async () => {
    const session = await connection().startSession();
    await session.withTransaction(async () => {
      await probe().insertOne({ k: 'a' }, { session });
      await probe().insertOne({ k: 'b' }, { session });
    });
    await session.endSession();
    expect(await probe().countDocuments({ k: { $in: ['a', 'b'] } })).toBe(2);
  });

  it('rolls everything back when the callback throws', async () => {
    const session = await connection().startSession();
    await expect(
      session.withTransaction(async () => {
        await probe().insertOne({ k: 'c' }, { session });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await session.endSession();
    expect(await probe().countDocuments({ k: 'c' })).toBe(0);
  });
});
