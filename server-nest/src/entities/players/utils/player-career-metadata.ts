import { IPlayerMetadata } from '../constants/player-career-metadata';
import { getMaxRepeatedCountHelper, sum } from './player-common-metadata';

export function calculateCareerAncientRatingSystem(
  original: IPlayerMetadata['ancientRatingSystem'],
  input: IPlayerMetadata['ancientRatingSystem'],
): IPlayerMetadata['ancientRatingSystem'] {
  return {
    plusMinus: sum(original.plusMinus, input.plusMinus),
    lastResult: sum(original.lastResult, input.lastResult),
    totalPoints: sum(original.totalPoints, input.totalPoints),
  };
}

export function calculateCareerPositionalRatingSystem(
  original: IPlayerMetadata['positionalRatingSystem'],
  input: IPlayerMetadata['positionalRatingSystem'],
): IPlayerMetadata['positionalRatingSystem'] {
  return {
    plusMinus: sum(original.plusMinus, input.plusMinus),
    lastResult: sum(original.lastResult, input.lastResult),
    totalPoints: sum(original.totalPoints, input.totalPoints),
  };
}

export function accumulatePlayerCareerMetadata(
  original: IPlayerMetadata,
  input: IPlayerMetadata,
): IPlayerMetadata {
  const gamesResults = original.gamesResults.concat(input.gamesResults) as (
    1 | 0 | -1
  )[];

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

    totalGames: sum(original.totalGames, input.totalGames),
    totalWonGames: sum(original.totalWonGames, input.totalWonGames),
    totalDraws: sum(original.totalDraws, input.totalDraws),
    totalLostGames: sum(original.totalLostGames, input.totalLostGames),

    totalMvp: sum(original.totalMvp, input.totalMvp),
    totalMvpByGoals: sum(original.totalMvpByGoals, input.totalMvpByGoals),
    totalMvpByPasses: sum(original.totalMvpByPasses, input.totalMvpByPasses),

    totalPlayedAsTransfer: sum(
      original.totalPlayedAsTransfer,
      input.totalPlayedAsTransfer,
    ),
    totalPlayedAsCaptain: sum(
      original.totalPlayedAsCaptain,
      input.totalPlayedAsCaptain,
    ),
    totalPlayedAsFirstDraft: sum(
      original.totalPlayedAsFirstDraft,
      input.totalPlayedAsFirstDraft,
    ),
    totalPlayedAsSecondDraft: sum(
      original.totalPlayedAsSecondDraft,
      input.totalPlayedAsSecondDraft,
    ),

    gamesResults,
    gamesIds: original.gamesIds.concat(input.gamesIds) as string[],
    captainedGamesIds: original.captainedGamesIds.concat(
      input.captainedGamesIds,
    ) as string[],
    captainedByPlayersIds: original.captainedByPlayersIds.concat(
      input.captainedByPlayersIds,
    ) as string[],

    gamesMaxWinStreak: getMaxRepeatedCountHelper(gamesResults, 1),
    gamesMaxDraftStreak: getMaxRepeatedCountHelper(gamesResults, 0),
    gamesMaxLostStreak: getMaxRepeatedCountHelper(gamesResults, -1),

    ancientRatingSystem: calculateCareerAncientRatingSystem(
      original.ancientRatingSystem,
      input.ancientRatingSystem,
    ),
    positionalRatingSystem: calculateCareerPositionalRatingSystem(
      original.positionalRatingSystem,
      input.positionalRatingSystem,
    ),
  };
}
