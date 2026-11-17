import { describe, expect, it } from 'vitest';
import { boardQuery, parseBoardQuery } from './board-query';

const seasons = ['2026', '2025', '2024'];
const statuses = ['All', 'Published', 'Draft', 'Skipped'];

describe('games list in the URL (S10.1)', () => {
  it('takes the season and the status from the address', () => {
    expect(
      parseBoardQuery({ season: '2025', status: 'Draft' }, seasons, statuses),
    ).toEqual({ season: '2025', status: 'Draft' });
  });

  it('garbage and missing values fall back to the newest season and All', () => {
    expect(
      parseBoardQuery({ season: '1999', status: 'x' }, seasons, statuses),
    ).toEqual({ season: '2026', status: 'All' });
    expect(parseBoardQuery({}, seasons, statuses)).toEqual({
      season: '2026',
      status: 'All',
    });
  });

  it('the default choice leaves the address clean', () => {
    expect(boardQuery('2026', 'All', seasons[0])).toEqual({
      season: null,
      status: null,
    });
    expect(boardQuery('2025', 'Draft', seasons[0])).toEqual({
      season: '2025',
      status: 'Draft',
    });
  });
});
