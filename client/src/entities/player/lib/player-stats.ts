/**
 * Reads of the player metadata for the ranking and the player page (view model only).
 * The numbers are calculated by the server (@sfl/domain); here nothing is recalculated,
 * only picked, ordered and formatted.
 */

export interface RatingView {
  plusMinus: number;
  lastResult: number;
  totalPoints: number;
}

export interface MetadataView {
  totalGames: number;
  totalWonGames: number;
  totalDraws: number;
  totalLostGames: number;
  totalGoals: number;
  totalGoalsByLeg: number;
  totalGoalsByHead: number;
  totalGoalsByPenalty: number;
  totalGoalsByAuto: number;
  totalPasses: number;
  totalMvp: number;
  totalPlayedAsCaptain: number;
  totalPlayedAsFirstDraft: number;
  totalPlayedAsSecondDraft: number;
  gamesIds: string[];
  gamesResults: (1 | 0 | -1)[];
  gamesMaxWinStreak: number;
  captainedGamesIds: string[];
  ancientRatingSystem: RatingView;
  positionalRatingSystem: RatingView;
}

export interface PlayerMetadataView {
  byGame?: Record<string, { totalPoints?: number; hasWon?: boolean }>;
  bySeason?: Record<string, MetadataView>;
  byCareer?: MetadataView;
}

export interface PlayerLike {
  id: string;
  nickname: string;
  number?: number;
  isCaptain?: boolean;
  metadata?: unknown;
}

export type RatingSystem = 'Ancient' | 'Positional';
/** A season year as a string, or `all` for the career. */
export type SeasonKey = string;
export const ALL_TIME = 'all';

export interface RankingRow {
  id: string;
  rank: number;
  name: string;
  ini: string;
  no: number | null;
  days: number;
  goals: number;
  passes: number;
  og: number;
  pm: number;
  lr: number;
  mvp: number;
  pts: number;
  form: string;
  isCaptain: boolean;
}

export const metadataOf = (p: PlayerLike): PlayerMetadataView =>
  (p.metadata ?? {}) as PlayerMetadataView;

export function seasonMetadata(
  p: PlayerLike,
  season: SeasonKey,
): MetadataView | null {
  const m = metadataOf(p);
  return (season === ALL_TIME ? m.byCareer : m.bySeason?.[season]) ?? null;
}

export const ratingOf = (m: MetadataView, system: RatingSystem): RatingView =>
  system === 'Ancient' ? m.ancientRatingSystem : m.positionalRatingSystem;

const LETTER = { 1: 'W', 0: 'D', '-1': 'L' } as const;

/** Last `n` results as letters, the newest on the right. */
export const formLetters = (results: readonly number[], n = 5): string =>
  results
    .slice(-n)
    .map(r => LETTER[String(r) as keyof typeof LETTER] ?? 'D')
    .join('');

export const initials = (name: string): string =>
  name
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2)
    .toUpperCase() || '?';

/** `+3`, `-2`, `0`: the sign is part of the text, colour is never the only carrier. */
export const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** Players who played the season, by points; a tie goes to more goals, then to the name. */
export function rankingRows(
  players: readonly PlayerLike[],
  season: SeasonKey,
  system: RatingSystem,
): RankingRow[] {
  return players
    .flatMap(p => {
      const m = seasonMetadata(p, season);
      if (!m || m.totalGames === 0) {
        return [];
      }
      const r = ratingOf(m, system);
      return [
        {
          id: p.id,
          name: p.nickname,
          ini: initials(p.nickname),
          no: p.number ?? null,
          days: m.totalGames,
          goals: m.totalGoals,
          passes: m.totalPasses,
          og: m.totalGoalsByAuto,
          pm: r.plusMinus,
          lr: r.lastResult,
          mvp: m.totalMvp,
          pts: r.totalPoints,
          form: formLetters(m.gamesResults),
          isCaptain: Boolean(p.isCaptain),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.pts - a.pts || b.goals - a.goals || a.name.localeCompare(b.name),
    )
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

/** Seasons in which the player has statistics, newest first. */
export const playedSeasons = (p: PlayerLike): string[] =>
  Object.keys(metadataOf(p).bySeason ?? {})
    .filter(s => (metadataOf(p).bySeason?.[s]?.totalGames ?? 0) > 0)
    .sort((a, b) => Number(b) - Number(a));

/** Every season that any player has, newest first. */
export const allSeasons = (players: readonly PlayerLike[]): string[] =>
  [...new Set(players.flatMap(playedSeasons))].sort(
    (a, b) => Number(b) - Number(a),
  );

export interface NumberCard {
  label: string;
  value: string;
  sub: string;
  tip: string;
}

const perDay = (n: number, days: number) =>
  days ? `${(n / days).toFixed(1)} per day` : '';

/** Cards of the player page for a season or the career. */
export function numberCards(
  m: MetadataView,
  system: RatingSystem,
  rank: number | null,
): NumberCard[] {
  const r = ratingOf(m, system);
  const rate = m.totalGames
    ? Math.round((m.totalWonGames / m.totalGames) * 100)
    : 0;
  return [
    {
      label: 'Days',
      value: String(m.totalGames),
      sub: `${m.totalWonGames} W · ${m.totalDraws} D · ${m.totalLostGames} L`,
      tip: 'Saturdays the player took part in.',
    },
    {
      label: 'Goals',
      value: String(m.totalGoals),
      sub: perDay(m.totalGoals, m.totalGames),
      tip: 'A header counts double in points.',
    },
    {
      label: 'Passes',
      value: String(m.totalPasses),
      sub: perDay(m.totalPasses, m.totalGames),
      tip: '+1 point for the passer.',
    },
    {
      label: 'Own goals',
      value: String(m.totalGoalsByAuto),
      sub: '',
      tip: '−1 point for the author.',
    },
    {
      label: 'Headers',
      value: String(m.totalGoalsByHead),
      sub: m.totalGoals
        ? `${Math.round((m.totalGoalsByHead / m.totalGoals) * 100)}% of goals`
        : '',
      tip: '',
    },
    ...(rank
      ? [
          {
            label: 'Place',
            value: `#${rank}`,
            sub: 'in the ranking',
            tip: 'Place in the ranking of the chosen system.',
          },
        ]
      : []),
    {
      label: '+/−',
      value: signed(r.plusMinus),
      sub: '',
      tip: 'Team goals minus rival goals per game, summed.',
    },
    {
      label: 'LR',
      value: signed(r.lastResult),
      sub: '',
      tip: '+1 for a win, −1 for a loss, 0 for a draw.',
    },
    { label: 'MVP', value: String(m.totalMvp), sub: '', tip: '' },
    {
      label: 'Win rate',
      value: `${rate}%`,
      sub: `best streak ${m.gamesMaxWinStreak}`,
      tip: '',
    },
    {
      label: 'Points',
      value: String(r.totalPoints),
      sub: perDay(r.totalPoints, m.totalGames),
      tip: '',
    },
  ];
}

export interface PointsBar {
  v: number;
  win: boolean;
  label: string;
}

/** Points per game of a season from `byGame` (keys `season:number`), in game order. */
export function pointsPerGame(p: PlayerLike, season: string): PointsBar[] {
  return Object.entries(metadataOf(p).byGame ?? {})
    .flatMap(([key, g]) => {
      const [s, n] = key.split(':');
      return s === season ? [{ n: Number(n), g }] : [];
    })
    .sort((a, b) => a.n - b.n)
    .map(({ n, g }) => ({
      v: Math.max(0, g.totalPoints ?? 0),
      win: Boolean(g.hasWon),
      label: String(n),
    }));
}

/** Win rate of a captain: results of the games he captained, from `gamesIds` and `gamesResults`. */
export function captainRecord(m: MetadataView) {
  const results = m.captainedGamesIds
    .map(id => m.gamesIds.indexOf(id))
    .filter(i => i >= 0)
    .map(i => m.gamesResults[i]);
  const w = results.filter(r => r === 1).length;
  const d = results.filter(r => r === 0).length;
  const l = results.filter(r => r === -1).length;
  const games = results.length;
  return { games, w, d, l, rate: games ? Math.round((w / games) * 100) : 0 };
}

const gamesOfSeason = (p: PlayerLike, season: string) =>
  Object.entries(metadataOf(p).byGame ?? {}).flatMap(([key, g]) => {
    const [s, n] = key.split(':');
    return s === season ? [{ n: Number(n), g }] : [];
  });

/** The highest game number anybody played in the season: Saturdays after it are still ahead. */
export const lastPlayedGame = (
  players: readonly PlayerLike[],
  season: string,
): number =>
  Math.max(0, ...players.flatMap(p => gamesOfSeason(p, season).map(x => x.n)));

export interface SaturdayCell {
  n: number;
  state: 'played' | 'missed' | 'future';
  points: number | null;
  win: boolean;
}

/** One cell per Saturday of the season (board Player, "Saturdays of the season"). */
export function seasonSaturdays(
  p: PlayerLike,
  season: string,
  totalWeeks: number,
  lastPlayed: number,
): SaturdayCell[] {
  const byNumber = new Map(gamesOfSeason(p, season).map(x => [x.n, x.g]));
  return Array.from({ length: totalWeeks }, (_, i) => {
    const n = i + 1;
    const g = byNumber.get(n);
    if (g) {
      return {
        n,
        state: 'played' as const,
        points: g.totalPoints ?? 0,
        win: Boolean(g.hasWon),
      };
    }
    return {
      n,
      state: n <= lastPlayed ? ('missed' as const) : ('future' as const),
      points: null,
      win: false,
    };
  });
}
