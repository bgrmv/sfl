import { describe, expect, it } from 'vitest';

import { ZodValidationPipe } from '../../shared/pipes/custom-pipe/zod-validation.pipe';
import { RecalculateSeasonDTO } from './players.dto';

describe('RecalculateSeasonDTO', () => {
  const pipe = new ZodValidationPipe(RecalculateSeasonDTO);

  it('accepts a valid body', () => {
    expect(pipe.transform({ seasonId: 2025, playerIds: ['abc'] })).toEqual({
      seasonId: 2025,
      playerIds: ['abc'],
    });
  });

  it.each([
    {},
    { seasonId: '2025', playerIds: ['a'] },
    { seasonId: 2025, playerIds: [] },
    { seasonId: 2025, playerIds: 'a' },
  ])('rejects %j with 400', body => {
    expect(() => pipe.transform(body)).toThrow('Validation failed');
  });
});
