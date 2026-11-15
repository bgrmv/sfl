import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { apiErrorMessage } from './api-error-message';

const err = (status: number, error?: unknown) =>
  new HttpErrorResponse({ status, error });

describe('apiErrorMessage', () => {
  it('lists validation issues with their paths', () => {
    const e = err(400, {
      statusCode: 400,
      message: 'Validation failed',
      issues: [
        { path: ['statistics', 2, 'position'], message: 'Position required' },
        { path: [], message: 'One captain per team' },
      ],
    });
    expect(apiErrorMessage(e)).toBe(
      'statistics.2.position: Position required\nOne captain per team',
    );
  });

  it('cuts a long list of issues', () => {
    const issues = Array.from({ length: 8 }, (_, i) => ({
      path: [i],
      message: 'bad',
    }));
    const text = apiErrorMessage(err(400, { issues }));
    expect(text.split('\n')).toHaveLength(6);
    expect(text).toContain('…and 3 more');
  });

  it('falls back to the message of the server', () => {
    expect(apiErrorMessage(err(404, { message: 'Game not found' }))).toBe(
      'Game not found',
    );
  });

  it('explains a lost connection and a server error', () => {
    expect(apiErrorMessage(err(0))).toBe('No connection to the server.');
    expect(apiErrorMessage(err(500, {}))).toBe(
      'Server error. Try again later.',
    );
  });

  it('uses the fallback for unknown errors', () => {
    expect(apiErrorMessage(new Error('x'), 'Nope')).toBe('Nope');
  });
});
