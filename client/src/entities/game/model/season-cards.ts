import { getTotalWeeksBySeason } from '@shared/lib/date';
import { nextSaturday } from 'date-fns';
import { range } from 'lodash-es';
import { EnumGameStatus } from './game-status';
import { IGameDTO } from './game';

/** The placeholder of a Saturday without a played game. */
export function placeholderCard({
  season,
  number,
  playedAt,
}: Pick<IGameDTO, 'season' | 'number' | 'playedAt'>): IGameDTO {
  return {
    id: `game-card-${season}-${number}`,
    number,
    season,
    teams: [],
    playedAt,
    status: EnumGameStatus.Furture,
    statistics: [],
    link: '',
    description: '',
    notes: ['', ''],
  };
}

/** Every Saturday of the season: the played game or a placeholder. */
export function buildSeasonCards(
  games: IGameDTO[],
  season: number,
): IGameDTO[] {
  // Local calendar date: a string `YYYY-12-01` is parsed as UTC and is
  // 30 November in the west of Greenwich
  let date = new Date(season - 1, 11, 1);

  return range(1, getTotalWeeksBySeason(season) + 1).map(number => {
    date = nextSaturday(date);

    return (
      games.find(game => game.number === number) ??
      placeholderCard({ season, number, playedAt: date })
    );
  });
}
