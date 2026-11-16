import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PlayerMetadataService } from './player-metadata.service';

const makeService = (impl: (id: string) => Promise<void>) => {
  const logger = { info: vi.fn(), error: vi.fn() };
  const service = new PlayerMetadataService(
    null as any,
    null as any,
    logger as any,
  );
  const calls: string[] = [];
  (service as any).recalculateSeasonMetadata = async (id: string) => {
    calls.push(`start ${id}`);
    await impl(id);
    calls.push(`end ${id}`);
  };
  return { service, calls, logger };
};

describe('recalculatePlayersSeasonAndCareerMetadata', () => {
  it('awaits every player sequentially before resolving', async () => {
    const { service, calls } = makeService(
      () => new Promise(r => setTimeout(r, 5)),
    );

    await service.recalculatePlayersSeasonAndCareerMetadata(2025, ['a', 'b']);

    expect(calls).toEqual(['start a', 'end a', 'start b', 'end b']);
  });

  it('reports failed players in the error and the log, and still processes the rest', async () => {
    const { service, calls, logger } = makeService(async id => {
      if (id === 'a') throw new Error('boom');
    });

    const result = service.recalculatePlayersSeasonAndCareerMetadata(2025, [
      'a',
      'b',
    ]);

    await expect(result).rejects.toBeInstanceOf(InternalServerErrorException);
    await result.catch((e: InternalServerErrorException) => {
      expect((e.getResponse() as any).failed).toEqual([
        { playerId: 'a', error: 'boom' },
      ]);
    });
    expect(calls).toContain('end b');
    expect(logger.error).toHaveBeenCalled();
  });
});
