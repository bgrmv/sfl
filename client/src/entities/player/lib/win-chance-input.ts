import {
  ratingOf,
  seasonMetadata,
  type PlayerLike,
  type RatingSystem,
  type SeasonKey,
} from './player-stats';

/** What `winChance` of @sfl/domain needs to know about a player (GLOSSARY: win chance). */
export interface StrengthInput {
  games: number;
  points: number;
  last: number;
}

/** Games, points and the result of the last game of the player; no history is zeros. */
export function strengthInput(
  player: PlayerLike,
  system: RatingSystem,
  season: SeasonKey,
): StrengthInput {
  const m = seasonMetadata(player, season);
  if (!m) return { games: 0, points: 0, last: 0 };
  const rating = ratingOf(m, system);
  return {
    games: m.totalGames ?? 0,
    points: rating?.totalPoints ?? 0,
    last: rating?.lastResult ?? 0,
  };
}

/** Points per game of everybody who played the season: the league average. */
export function leagueAverage(
  players: readonly PlayerLike[],
  system: RatingSystem,
  season: SeasonKey,
): number {
  let games = 0;
  let points = 0;
  for (const player of players) {
    const input = strengthInput(player, system, season);
    games += input.games;
    points += input.points;
  }
  return games === 0 ? 0 : points / games;
}
