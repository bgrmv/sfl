import { describe, expect, it } from 'vitest';
import { seasonKeyOf, seasonLabel } from './season-label';

describe('season label', () => {
  it('names a season by its year and the career as All time', () => {
    expect(seasonLabel('2026')).toBe('S26');
    expect(seasonLabel('all')).toBe('All time');
  });
  it('turns the label back into the key', () => {
    expect(seasonKeyOf('S26')).toBe('2026');
    expect(seasonKeyOf('All time')).toBe('all');
  });
});
