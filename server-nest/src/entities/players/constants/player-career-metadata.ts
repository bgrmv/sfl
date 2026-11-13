import { EnumPlayerPosition } from '@sfl/schemas';

export interface IRatingSystem {
  /**
   * +/- Statistics
   *
   * The goal difference of the player's team in the game: own team's score
   * minus the opponent's. Time on the field is not tracked.
   *
   * Represents players impact.
   */
  plusMinus: number;

  /**
   * LR: Last Result Statistics
   *
   * +1 point if your team won the match
   * -1 point if your team lost the match
   *
   * Represents the outcome (common result) of the games.
   */
  lastResult: number;

  /**
   * Total Points Statistics
   *
   * Represents the total points accumulated by the player.
   *
   * This value is calculated individually for different rating systems,
   * reflecting the player's performance across various metrics.
   */
  totalPoints: number;
}

export interface IAncientRatingSystem extends IRatingSystem {
  /**
   * Total Points Statistics
   *
   * Represents the total points accumulated by the player.
   *
   * This value is calculated individually for different rating systems,
   * reflecting the player's performance across various metrics.
   *
   * +1 points for pass
   * +1 points for regular goal or penalty
   * +2 points for goal by head
   * -1 point for own goal
   */
  totalPoints: number;
}

export interface IPositionalRatingSystem extends IRatingSystem {
  /**
   * Total Points Statistics
   *
   * Represents the total points accumulated by the player.
   *
   * This value is calculated individually for different rating systems,
   * reflecting the player's performance across various metrics.
   *
   * GL: Goalkeeper
   * +4 if game is won
   * -4 if game is lost
   *
   * D: Defender
   * +3 if game is won
   * -3 if game is lost
   *
   * M: Midfielder | Winger
   * +2 if game is won
   * -2 if game is lost
   *
   * F: Forward
   * +1 if game is won
   * -1 if game is lost
   *
   * +1 points for pass
   * +1 points for regular goal or penalty, +2 for goal by head
   * -1 point for own goal
   */
  totalPoints: number;
}

export interface IPlayerMetadataByGame {
  isMvp: boolean;
  isMvpByGoals: boolean;
  isMvpByPasses: boolean;

  asCaptain: boolean;
  asTransfer: boolean;
  asFirstDraft: boolean;
  asSecondDraft: boolean;

  hasWon: boolean;
  hasDraw: boolean;
  hasLose: boolean;
  hasPosition: null | EnumPlayerPosition;
}

export interface IPlayerCommonTotalsMetadata {
  totalGoalsByLeg: number;
  totalGoalsByHead: number;
  totalGoalsByPenalty: number;
  totalGoalsByAuto: number;
  totalGoals: number;
  totalPasses: number;
  totalPoints: number;
}

export interface IPlayerMetadata extends Omit<
  IPlayerCommonTotalsMetadata,
  'totalPoints'
> {
  totalGames: number;
  totalWonGames: number;
  totalDraws: number;
  totalLostGames: number;

  totalPlayedAsTransfer: number;
  totalPlayedAsCaptain: number;
  totalPlayedAsFirstDraft: number;
  totalPlayedAsSecondDraft: number;

  totalMvp: number;
  totalMvpByGoals: number;
  totalMvpByPasses: number;

  gamesIds: string[];
  gamesResults: (1 | 0 | -1)[];
  gamesMaxWinStreak: number;
  gamesMaxDraftStreak: number;
  gamesMaxLostStreak: number;

  /**
   * List of games where the player served as captain.
   *
   * Example:
   * [
   *   gameId-1, // Game ID 1 where the player was captain
   *   gameId-n  // Game ID n where the player was captain
   * ]
   */
  captainedGamesIds: string[];

  /**
   * Captained by statistics: Count of how many times each player was under the captaincy.
   *
   * Example:
   * [
   *   playerId-1,
   *   playerId-n,
   * ]
   */
  captainedByPlayersIds: string[];

  ancientRatingSystem: IAncientRatingSystem;
  positionalRatingSystem: IPositionalRatingSystem;
}

export type TPlayerMetadata = {
  byGame: Record<
    `${number}:${number}`,
    IPlayerMetadataByGame & IPlayerCommonTotalsMetadata
  >;
  bySeason: Record<number, IPlayerMetadata>;
  byCareer: IPlayerMetadata;
};

export { EnumPlayerPosition };

export const RATING_SYSTEM_DEFAULT:
  IAncientRatingSystem | IPositionalRatingSystem = Object.freeze({
  plusMinus: 0,
  lastResult: 0,
  totalPoints: 0,
});

export const METADATA_BY_GAME_DEFAULT: IPlayerMetadataByGame = Object.freeze({
  isMvp: false,
  isMvpByGoals: false,
  isMvpByPasses: false,

  asCaptain: false,
  asTransfer: false,
  asFirstDraft: false,
  asSecondDraft: false,

  hasWon: false,
  hasDraw: false,
  hasLose: false,
  hasPosition: null,

  totalPoints: 0,
});

export const METADATA_COMMON_TOTALS_GAME_DEFAULT: IPlayerCommonTotalsMetadata =
  Object.freeze({
    totalPasses: 0,
    totalGoalsByLeg: 0,
    totalGoalsByHead: 0,
    totalGoalsByPenalty: 0,
    totalGoalsByAuto: 0,
    totalGoals: 0,
    totalPoints: 0,
  });

export const METADATA_DEFAULT: IPlayerMetadata = Object.freeze({
  ...METADATA_COMMON_TOTALS_GAME_DEFAULT,

  totalGames: 0,
  totalWonGames: 0,
  totalDraws: 0,
  totalLostGames: 0,
  totalPlayedAsTransfer: 0,
  totalPlayedAsCaptain: 0,
  totalPlayedAsFirstDraft: 0,
  totalPlayedAsSecondDraft: 0,

  totalMvp: 0,
  totalMvpByGoals: 0,
  totalMvpByPasses: 0,

  gamesIds: [],
  gamesResults: [],
  gamesMaxWinStreak: 0,
  gamesMaxDraftStreak: 0,
  gamesMaxLostStreak: 0,

  /**
   * List of games where the player served as captain.
   *
   * Example:
   * [
   *   gameId-1, // Game ID 1 where the player was captain
   *   gameId-n  // Game ID n where the player was captain
   * ]
   */
  captainedGamesIds: [],
  /**
   * Captained by statistics: Count of how many times each player was under the captaincy.
   *
   * Example:
   * [
   *   playerId-1,
   *   playerId-n,
   * ]
   */
  captainedByPlayersIds: [],
  ancientRatingSystem: { ...RATING_SYSTEM_DEFAULT },
  positionalRatingSystem: { ...RATING_SYSTEM_DEFAULT },
});
