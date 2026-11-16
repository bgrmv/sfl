import { IPlayerMetadata } from './metadata.js';

export type SumOfMetadataAllowedKeys = keyof Pick<
  IPlayerMetadata,
  | 'totalGames'
  | 'totalGoals'
  | 'totalGoalsByHead'
  | 'totalGoalsByLeg'
  | 'totalGoalsByPenalty'
  | 'totalGoalsByAuto'
  | 'totalMvp'
  | 'totalMvpByGoals'
  | 'totalMvpByPasses'
  | 'totalPlayedAsCaptain'
  | 'totalPlayedAsFirstDraft'
  | 'totalPlayedAsSecondDraft'
  | 'totalPlayedAsTransfer'
  | 'totalPasses'
  | 'totalWonGames'
  | 'totalLostGames'
  | 'totalDraws'
>;

export function sum(num1: number, num2: number) {
  return num1 + num2;
}

export function sumByKey(
  key: SumOfMetadataAllowedKeys,
  {
    original,
    input,
  }: {
    original: IPlayerMetadata;
    input: IPlayerMetadata;
  },
) {
  return Number(original[key]) + Number(input[key]);
}

export type ConcatArraysOfMetadataAllowedKeys = keyof Pick<
  IPlayerMetadata,
  'gamesResults' | 'gamesIds' | 'captainedByPlayersIds' | 'captainedGamesIds'
>;

export function concatArraysByKey(
  key: ConcatArraysOfMetadataAllowedKeys,
  {
    original,
    input,
  }: {
    original: IPlayerMetadata;
    input: IPlayerMetadata;
  },
) {
  return original[key].concat(input[key]);
}

export function getMaxRepeatedCountHelper(
  arr: number[],
  value: number,
): number {
  let maxCount = 0,
    currentCount = 0;

  for (const num of arr) {
    currentCount = num === value ? currentCount + 1 : 0;
    maxCount = Math.max(maxCount, currentCount);
  }

  return maxCount;
}
