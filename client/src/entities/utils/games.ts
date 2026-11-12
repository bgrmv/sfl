import { TGameFinalWithoutStatistics } from '@entities/games/types';
import {
  addYears,
  differenceInWeeks,
  nextSaturday,
  startOfMonth,
} from 'date-fns';

// const third = 3;

// TODO ! Rework! Cards have wrong numbers and playedAt
export const getGameCards = (year: number): TGameFinalWithoutStatistics[] => {
  const gameCards: TGameFinalWithoutStatistics[] = [];
  const startOfSeason = startOfMonth(new Date(`${year}-12-01`));

  const endOfSeason = addYears(startOfSeason, 1);

  // To make inclusive +1 week
  const weeksInclusive =
    Math.abs(differenceInWeeks(startOfSeason, endOfSeason)) + 1;

  let lastSaturday = startOfSeason;
  for (let weekIdx = 0; weekIdx < weeksInclusive; weekIdx++) {
    lastSaturday = nextSaturday(lastSaturday);

    // gameCards.push({
    //   status: EnumGameStatus.Draft,
    //   season: year,
    //   number: gameIdx + 1,
    //   playedAt: lastSaturday,
    // });
  }

  return gameCards;
};
