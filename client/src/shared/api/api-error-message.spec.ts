import type { ApiError } from '@sfl/schemas';
import { describe, expect, it } from 'vitest';

import { apiErrorMessage } from './api-error-message';

const error = (overrides: Partial<ApiError> = {}): ApiError => ({
  status: 400,
  code: 'BAD_REQUEST',
  message: 'Bad request',
  ...overrides,
});

describe('apiErrorMessage', () => {
  it('lists validation issues with their paths', () => {
    const text = apiErrorMessage(
      error({
        code: 'VALIDATION_FAILED',
        issues: [
          { path: 'statistics.2.position', message: 'Position required' },
          { path: '', message: 'One captain per team' },
        ],
      }),
    );
    expect(text).toBe(
      'statistics.2.position: Position required\nOne captain per team',
    );
  });

  it('cuts a long list of issues', () => {
    const issues = Array.from({ length: 8 }, (_, i) => ({
      path: String(i),
      message: 'bad',
    }));
    const text = apiErrorMessage(error({ issues }));
    expect(text.split('\n')).toHaveLength(6);
    expect(text).toContain('…and 3 more');
  });

  it('uses the message of the server', () => {
    expect(
      apiErrorMessage(
        error({ status: 404, code: 'NOT_FOUND', message: 'Game not found' }),
      ),
    ).toBe('Game not found');
  });

  it('hides the text of a server error', () => {
    expect(
      apiErrorMessage(error({ status: 500, code: 'INTERNAL_ERROR' })),
    ).toBe('Server error. Try again later.');
  });
});
