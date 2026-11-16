import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { TransactionService } from './transaction.service';

const makeService = (withTransaction: () => Promise<unknown>) => {
  const session = { withTransaction, endSession: vi.fn() };
  const connection = { startSession: async () => session };
  return {
    service: new TransactionService(connection as any),
    session,
  };
};

describe('TransactionService', () => {
  it('explains a database without a replica set and ends the session', async () => {
    const { service, session } = makeService(async () => {
      throw Object.assign(
        new Error(
          'Transaction numbers are only allowed on a replica set member or mongos',
        ),
        { code: 20 },
      );
    });

    await expect(service.run(async () => 1)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(session.endSession).toHaveBeenCalled();
  });

  it('passes other errors through', async () => {
    const { service } = makeService(async () => {
      throw new RangeError('boom');
    });

    await expect(service.run(async () => 1)).rejects.toBeInstanceOf(RangeError);
  });
});
