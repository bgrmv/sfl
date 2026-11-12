/* eslint-disable @typescript-eslint/no-unused-vars -- unfinished stub, see TODO below */
import { Pipe, PipeTransform } from '@angular/core';
import { groupBy } from 'lodash-es';
import { TGameFinal, TPlayerStatisticFinal } from '../types';

// TODO component with
// head emoji (2) goalsByLeg emoji (1) goalsByPenalty emoji (0) passes emoji (1) mvp emoji (1)
const calculateStats = (stats: TPlayerStatisticFinal[]): number => {
  return stats.reduce((acc, stat) => {
    return acc + stat.goalsByLeg + stat.goalsByHead * 2 + stat.goalsByPenalty;
  }, 0);
};

@Pipe({
  name: 'gameListStatistics',
  standalone: true,
  pure: true,
})
export class GameListStatisticsPipe implements PipeTransform {
  transform(game: TGameFinal): string {
    const stats = groupBy(game.statistics, 'teamId');

    const team1 = game.teams[0];
    const team2 = game.teams[1];
    // TODO change _id
    // return `${team1.name.toUpperCase()} ${calculateStats(stats[team1._id as])} : ${calculateStats(stats[team2._id])} ${team2.name.toUpperCase()}`;

    return 'FIX gameListStatistics';
  }
}
