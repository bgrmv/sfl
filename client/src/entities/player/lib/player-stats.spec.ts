import { describe, expect, it } from 'vitest';
import {
  captainRecord,
  lastPlayedGame,
  seasonSaturdays,
  formLetters,
  numberCards,
  playedSeasons,
  pointsPerGame,
  rankingRows,
  signed,
  type MetadataView,
  type PlayerLike,
} from './player-stats';

const meta = (over: Partial<MetadataView> = {}): MetadataView => ({
  totalGames: 3,
  totalWonGames: 2,
  totalDraws: 0,
  totalLostGames: 1,
  totalGoals: 4,
  totalGoalsByLeg: 2,
  totalGoalsByHead: 2,
  totalGoalsByPenalty: 0,
  totalGoalsByAuto: 0,
  totalPasses: 1,
  totalMvp: 1,
  totalPlayedAsCaptain: 0,
  totalPlayedAsFirstDraft: 0,
  totalPlayedAsSecondDraft: 0,
  gamesIds: ['a', 'b', 'c'],
  gamesResults: [1, -1, 1],
  gamesMaxWinStreak: 1,
  captainedGamesIds: [],
  ancientRatingSystem: { plusMinus: 3, lastResult: 1, totalPoints: 10 },
  positionalRatingSystem: { plusMinus: 3, lastResult: 1, totalPoints: 14 },
  ...over,
});

const player = (
  id: string,
  nickname: string,
  m: MetadataView | null,
  extra: Partial<PlayerLike> = {},
): PlayerLike => ({
  id,
  nickname,
  metadata: m ? { bySeason: { '2026': m }, byCareer: m } : {},
  ...extra,
});

describe('rankingRows', () => {
  it('orders by points of the chosen system and numbers the places', () => {
    const a = player('a', 'Anna', meta());
    const b = player(
      'b',
      'Boris',
      meta({
        ancientRatingSystem: { plusMinus: 0, lastResult: 0, totalPoints: 20 },
      }),
    );
    expect(
      rankingRows([a, b], '2026', 'Ancient').map(r => [r.name, r.rank]),
    ).toEqual([
      ['Boris', 1],
      ['Anna', 2],
    ]);
    expect(rankingRows([a, b], '2026', 'Positional')[0].name).toBe('Anna');
  });

  it('skips players without games in the season', () => {
    const none = player('n', 'None', meta({ totalGames: 0 }));
    const without = player('w', 'Without', null);
    expect(rankingRows([none, without], '2026', 'Ancient')).toEqual([]);
  });

  it('breaks a tie by goals, then by name', () => {
    const a = player('a', 'Zed', meta({ totalGoals: 5 }));
    const b = player('b', 'Amy', meta({ totalGoals: 5 }));
    const c = player('c', 'Max', meta({ totalGoals: 9 }));
    expect(rankingRows([a, b, c], '2026', 'Ancient').map(r => r.name)).toEqual([
      'Max',
      'Amy',
      'Zed',
    ]);
  });

  it('reads the career with `all`', () => {
    expect(
      rankingRows([player('a', 'Anna', meta())], 'all', 'Ancient'),
    ).toHaveLength(1);
  });
});

describe('form and signs', () => {
  it('turns results into letters, the last five', () => {
    expect(formLetters([1, 1, 0, -1, 1, -1])).toBe('WDLWL');
  });
  it('writes the sign into the text', () => {
    expect([signed(3), signed(-2), signed(0)]).toEqual(['+3', '-2', '0']);
  });
});

describe('player page helpers', () => {
  it('lists the played seasons, newest first', () => {
    const p: PlayerLike = {
      id: 'a',
      nickname: 'A',
      metadata: {
        bySeason: {
          '2024': meta(),
          '2026': meta(),
          '2025': meta({ totalGames: 0 }),
        },
      },
    };
    expect(playedSeasons(p)).toEqual(['2026', '2024']);
  });

  it('builds the cards, the place only when it is known', () => {
    const labels = (rank: number | null) =>
      numberCards(meta(), 'Ancient', rank).map(c => c.label);
    expect(labels(1)).toContain('Place');
    expect(labels(null)).not.toContain('Place');
    expect(
      numberCards(meta(), 'Ancient', null).find(c => c.label === 'Points')
        ?.value,
    ).toBe('10');
  });

  it('takes points per game of one season in game order', () => {
    const p: PlayerLike = {
      id: 'a',
      nickname: 'A',
      metadata: {
        byGame: {
          '2026:2': { totalPoints: 1, hasWon: false },
          '2026:1': { totalPoints: 3, hasWon: true },
          '2025:1': { totalPoints: 9 },
        },
      },
    };
    expect(pointsPerGame(p, '2026')).toEqual([
      { v: 3, win: true, label: '1' },
      { v: 1, win: false, label: '2' },
    ]);
  });

  it('counts the record of a captain from the games he captained', () => {
    const m = meta({ captainedGamesIds: ['a', 'b'] });
    expect(captainRecord(m)).toEqual({ games: 2, w: 1, d: 0, l: 1, rate: 50 });
    expect(captainRecord(meta()).rate).toBe(0);
  });
});

describe('Saturdays of the season', () => {
  const p: PlayerLike = {
    id: 'a',
    nickname: 'A',
    metadata: {
      byGame: {
        '2026:1': { totalPoints: 3, hasWon: true },
        '2026:3': { totalPoints: 0, hasWon: false },
        '2025:2': { totalPoints: 9, hasWon: true },
      },
    },
  };
  const other: PlayerLike = {
    id: 'b',
    nickname: 'B',
    metadata: { byGame: { '2026:4': { totalPoints: 1 } } },
  };

  it('finds the last played game of the league in the season', () => {
    expect(lastPlayedGame([p, other], '2026')).toBe(4);
    expect(lastPlayedGame([p, other], '2030')).toBe(0);
  });

  it('marks every Saturday: played with points, missed, not played yet', () => {
    const cells = seasonSaturdays(p, '2026', 6, 4);
    expect(cells.map(c => c.state)).toEqual([
      'played',
      'missed',
      'played',
      'missed',
      'future',
      'future',
    ]);
    expect(cells[0]).toEqual({ n: 1, state: 'played', points: 3, win: true });
    expect(cells[2].win).toBe(false);
    expect(cells[1].points).toBeNull();
  });
});
