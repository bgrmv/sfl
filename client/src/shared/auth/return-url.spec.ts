import { describe, expect, it } from 'vitest';

import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps an internal path with query and fragment', () => {
    expect(safeReturnUrl('/games/edit/2026/3?x=1#top')).toBe(
      '/games/edit/2026/3?x=1#top',
    );
  });

  it.each([
    undefined,
    null,
    '',
    42,
    'games',
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
  ])('falls back to the home page for %s', value => {
    expect(safeReturnUrl(value)).toBe('/');
  });

  it('does not send the person back to the sign-in page', () => {
    expect(safeReturnUrl('/sign-in?returnUrl=%2Fgames')).toBe('/');
  });
});
