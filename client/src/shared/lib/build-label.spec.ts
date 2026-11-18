import { describe, expect, it } from 'vitest';
import { buildLabel, isPreRelease } from './build-label';

const info = {
  version: '1.4.0',
  commit: 'abc1234',
  builtAt: '2026-11-18T10:30:00.000Z',
};

describe('build label', () => {
  it('shows the version, the commit and the date of the build', () => {
    expect(buildLabel(info)).toBe('1.4.0 · abc1234 · 18 Nov 2026');
  });
  it('leaves out the commit when the build had no git', () => {
    expect(buildLabel({ ...info, commit: 'unknown' })).toBe(
      '1.4.0 · 18 Nov 2026',
    );
  });
  it('treats 0.x as the time before the first release', () => {
    expect(isPreRelease('0.0.0')).toBe(true);
    expect(isPreRelease('1.0.0')).toBe(false);
  });
});
