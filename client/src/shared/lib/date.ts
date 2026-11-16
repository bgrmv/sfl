import {
  addWeeks,
  getISOWeeksInYear,
  isSaturday,
  nextSaturday,
  previousSaturday,
  startOfMonth,
} from 'date-fns';

export const getTotalWeeksBySeason = (season: number) =>
  getISOWeeksInYear(new Date(`${season}-12-01`));

export const getLastSaturday = isSaturday(new Date())
  ? new Date()
  : previousSaturday(new Date());

export const getStartOfSeason = (season: number) =>
  startOfMonth(new Date(`${season}-12-01`));

export const getSaturdayDateBySeasonAndNumber = (
  season: number,
  number: number,
) => {
  // Get the first day of the year
  const startOfSeason = getStartOfSeason(season);

  // Find the first Saturday of the season
  const firstSaturday = nextSaturday(startOfSeason);

  // Calculate the target Saturday by adding the necessary weeks
  const targetSaturday = addWeeks(firstSaturday, number - 1);

  return targetSaturday;
};
