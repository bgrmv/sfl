// The estimate of the chances of two squads before a game (GLOSSARY: Win chance).
// A pure function: the squads and the statistics come in, two numbers go out.

/** What the estimate needs to know about one player of a squad. */
export interface WinChancePlayer {
  /** Published games of the player in the chosen scope (season or career). */
  games: number;
  /** Points of the chosen rating system in those games. */
  points: number;
  /** The result of his last game: goals (a header counts 2) plus passes; 0 if none. */
  last: number;
}

export interface WinChance {
  /** Percent for the first team. */
  a: number;
  /** Percent for the second team; `a + b` is 100. */
  b: number;
}

/** The estimate is never a verdict. */
export const WIN_CHANCE_MIN = 25;
export const WIN_CHANCE_MAX = 75;

/** How many games of the league average a player is worth before his own games count. */
const PRIOR_GAMES = 5;
/** The share of the last game that is added to the form. */
const LAST_GAME_WEIGHT = 0.25;

/**
 * The strength of a player: points per game, pulled to the league average while
 * he has few games, plus a quarter of his last game. Not below zero.
 */
export function playerStrength(
  player: WinChancePlayer,
  leagueAverage: number,
): number {
  const form =
    (player.points + PRIOR_GAMES * leagueAverage) /
    (player.games + PRIOR_GAMES);
  return Math.max(0, form + LAST_GAME_WEIGHT * player.last);
}

const strengthOf = (squad: readonly WinChancePlayer[], average: number) =>
  squad.reduce((sum, player) => sum + playerStrength(player, average), 0);

/**
 * The chances of the first and the second squad in whole percent, 25 to 75,
 * summing to 100. Equal squads, empty squads and squads of zero strength give 50/50.
 */
export function winChance(
  first: readonly WinChancePlayer[],
  second: readonly WinChancePlayer[],
  leagueAverage: number,
): WinChance {
  const a = strengthOf(first, leagueAverage);
  const b = strengthOf(second, leagueAverage);
  if (a + b === 0) return { a: 50, b: 50 };

  const share = Math.round((a / (a + b)) * 100);
  const chance = Math.min(WIN_CHANCE_MAX, Math.max(WIN_CHANCE_MIN, share));
  return { a: chance, b: 100 - chance };
}
