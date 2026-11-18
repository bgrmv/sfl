import { describe, expect, it } from 'vitest';
import {
  filterByArea,
  hasUnseenRelease,
  type ReleaseNote,
} from './release-notes';

const release = (
  version: string,
  areas: (string | undefined)[],
): ReleaseNote => ({
  version,
  date: '2026-12-05',
  title: `Release ${version}`,
  changes: areas.map(area => ({
    kind: 'New',
    area: area as ReleaseNote['changes'][number]['area'],
    text: `${area}`,
  })),
});

describe('release notes', () => {
  it('filters the changes by area and drops releases left without changes', () => {
    const list = [
      release('1.1.0', ['Admin', 'Design']),
      release('1.0.0', ['Statistics']),
    ];

    const result = filterByArea(list, 'Admin');

    expect(result.map(r => r.version)).toEqual(['1.1.0']);
    expect(result[0].changes.map(c => c.area)).toEqual(['Admin']);
  });
  it('shows everything without a filter', () => {
    const list = [release('1.0.0', ['Statistics', undefined])];
    expect(filterByArea(list, null)).toEqual(list);
  });
  it('shows the dot when the last release was not opened yet', () => {
    expect(hasUnseenRelease('1.1.0', '1.0.0')).toBe(true);
    expect(hasUnseenRelease('1.1.0', '1.1.0')).toBe(false);
    expect(hasUnseenRelease('1.1.0', null)).toBe(true);
  });
  it('shows no dot when there is no release at all', () => {
    expect(hasUnseenRelease(undefined, null)).toBe(false);
  });
});
