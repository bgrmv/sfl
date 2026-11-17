import { describe, expect, it } from 'vitest';
import { leagueAverage, strengthInput } from './win-chance-input';

const player = (
  id: string,
  season?: { games: number; ancient: number; last: number; pos?: number },
) => ({
  id,
  nickname: id,
  metadata: season && {
    bySeason: {
      '2026': {
        totalGames: season.games,
        ancientRatingSystem: {
          totalPoints: season.ancient,
          lastResult: season.last,
          plusMinus: 0,
        },
        positionalRatingSystem: {
          totalPoints: season.pos ?? 0,
          lastResult: 0,
          plusMinus: 0,
        },
      },
    },
  },
});

describe('input of the win chance from the metadata (S10.67)', () => {
  it('takes games, points and the last result of the chosen system and season', () => {
    expect(
      strengthInput(
        player('a', { games: 4, ancient: 12, last: 3, pos: 20 }),
        'Ancient',
        '2026',
      ),
    ).toEqual({ games: 4, points: 12, last: 3 });
    expect(
      strengthInput(
        player('a', { games: 4, ancient: 12, last: 3, pos: 20 }),
        'Positional',
        '2026',
      ),
    ).toMatchObject({ points: 20 });
  });

  it('a player without a season is a player without history', () => {
    expect(strengthInput(player('b'), 'Ancient', '2026')).toEqual({
      games: 0,
      points: 0,
      last: 0,
    });
  });

  it('the league average is the points per game of everybody who played', () => {
    const avg = leagueAverage(
      [
        player('a', { games: 2, ancient: 6, last: 0 }),
        player('b', { games: 2, ancient: 2, last: 0 }),
        player('c'),
      ],
      'Ancient',
      '2026',
    );

    expect(avg).toBe(2);
  });

  it('no games anywhere: average 0, not a division by zero', () => {
    expect(leagueAverage([player('a')], 'Ancient', '2026')).toBe(0);
  });
});
