import { IGame } from 'src/entities/games/game.schema';
import {
  IPlayerCommonTotalsMetadata,
  IPlayerMetadata,
  IPlayerMetadataByGame,
} from '../constants/player-career-metadata';
import { getMaxRepeatedCountHelper, sum } from './player-common-metadata';

export function getPointsByPosition({
  hasPosition,
  hasDraw,
  hasWon,
  hasLose,
}: IPlayerMetadataByGame): -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 {
  // No bonus without a position, in a draw, or without a result (a transfer)
  if (hasDraw || !hasPosition || (!hasWon && !hasLose)) {
    return 0;
  }

  const positiveOrNegative = hasWon ? 1 : -1;

  switch (true) {
    case hasPosition.startsWith('GK'):
      return (positiveOrNegative * 4) as -4 | 4;
    case hasPosition.startsWith('DEF'):
      return (positiveOrNegative * 3) as -3 | 3;
    case hasPosition.startsWith('MID'):
      return (positiveOrNegative * 2) as -2 | 2;
    case hasPosition.startsWith('FRWD'):
      return (positiveOrNegative * 1) as -1 | 1;
    default:
      return 0;
  }
}

export function accumulatePlayerSeasonMetadata(
  original: IPlayerMetadata,
  input: IPlayerMetadataByGame & IPlayerCommonTotalsMetadata,
  game: WithId<IGame>,
): IPlayerMetadata {
  // Helpers
  const gameId = game.id.toString();
  const gameMetadata = game.metadata;
  const gameCaptainFirstDraft = gameMetadata.captainFirstDraft;
  const gameCaptainSecondDraft = gameMetadata.captainSecondDraft;

  const plusMinus = input.asFirstDraft
    ? gameMetadata.scoreFirstDraft - gameMetadata.scoreSecondDraft
    : gameMetadata.scoreSecondDraft - gameMetadata.scoreFirstDraft;

  // A draw and a transfer (no result) give 0
  const lr = input.hasWon ? 1 : input.hasLose ? -1 : 0;
  const gamesResults: (1 | 0 | -1)[] = [...original.gamesResults, lr];

  // Old rating system: a pass 1, a leg goal 1, a penalty 1, a head goal 2,
  // an own goal -1
  const inputAncientTotalPoints =
    input.totalPasses +
    input.totalGoalsByLeg +
    input.totalGoalsByPenalty +
    input.totalGoalsByHead * 2 -
    input.totalGoalsByAuto;

  // New rating system: the same points plus the bonus of the position
  const positionalTotalPoints =
    inputAncientTotalPoints + getPointsByPosition(input);

  return {
    totalPasses: sum(original.totalPasses, input.totalPasses),
    totalGoalsByLeg: sum(original.totalGoalsByLeg, input.totalGoalsByLeg),
    totalGoalsByHead: sum(original.totalGoalsByHead, input.totalGoalsByHead),
    totalGoalsByPenalty: sum(
      original.totalGoalsByPenalty,
      input.totalGoalsByPenalty,
    ),
    totalGoalsByAuto: sum(original.totalGoalsByAuto, input.totalGoalsByAuto),
    totalGoals: sum(original.totalGoals, input.totalGoals),

    totalGames: sum(original.totalGames, 1),
    totalWonGames: sum(original.totalWonGames, +input.hasWon),
    totalDraws: sum(original.totalDraws, +input.hasDraw),
    totalLostGames: sum(original.totalLostGames, +input.hasLose),

    totalMvp: sum(original.totalMvp, +input.isMvp),
    totalMvpByGoals: sum(original.totalMvpByGoals, +input.isMvpByGoals),
    totalMvpByPasses: sum(original.totalMvpByPasses, +input.isMvpByPasses),

    totalPlayedAsTransfer: sum(
      original.totalPlayedAsTransfer,
      +input.asTransfer,
    ),
    totalPlayedAsCaptain: sum(original.totalPlayedAsCaptain, +input.asCaptain),
    totalPlayedAsFirstDraft: sum(
      original.totalPlayedAsFirstDraft,
      +input.asFirstDraft,
    ),
    totalPlayedAsSecondDraft: sum(
      original.totalPlayedAsSecondDraft,
      +input.asSecondDraft,
    ),

    gamesResults,
    gamesIds: original.gamesIds.concat([gameId]),

    gamesMaxWinStreak: getMaxRepeatedCountHelper(gamesResults, 1),
    gamesMaxDraftStreak: getMaxRepeatedCountHelper(gamesResults, 0),
    gamesMaxLostStreak: getMaxRepeatedCountHelper(gamesResults, -1),

    captainedGamesIds: input.asCaptain
      ? original.captainedGamesIds.concat([gameId])
      : original.captainedGamesIds,
    captainedByPlayersIds: input.asCaptain
      ? original.captainedByPlayersIds
      : original.captainedByPlayersIds.concat([
          input.asFirstDraft ? gameCaptainFirstDraft : gameCaptainSecondDraft,
        ]),

    // Rating System
    ancientRatingSystem: {
      plusMinus: original.ancientRatingSystem.plusMinus + plusMinus,
      lastResult: original.ancientRatingSystem.lastResult + lr,
      totalPoints:
        original.ancientRatingSystem.totalPoints + inputAncientTotalPoints,
    },
    // Positional Rating System
    positionalRatingSystem: {
      plusMinus: original.positionalRatingSystem.plusMinus + plusMinus,
      lastResult: original.positionalRatingSystem.lastResult + lr,
      totalPoints:
        original.positionalRatingSystem.totalPoints + positionalTotalPoints,
    },
  };
}
