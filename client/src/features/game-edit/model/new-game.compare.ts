import { isEqual, pick } from 'lodash-es';
import {
  IPlayerStatisticDTO,
  TGameFinal,
  TPlayerStatisticFinal,
} from '@entities/game';
import { TTeamFinal } from '@entities/team';

// "Is the form changed": the game as it was loaded against the game as it is.

/** The fields of a row that count as a change. A new field is one line here. */
const STATISTIC_FIELDS = [
  'playerId',
  'teamId',
  'goalsByLeg',
  'goalsByHead',
  'goalsByPenalty',
  'goalsByAuto',
  'passes',
  'position',
  'isMVP',
  'isCaptain',
  'isTransfer',
] as const satisfies readonly (keyof IPlayerStatisticDTO)[];

const statisticView = (row: Partial<IPlayerStatisticDTO>) =>
  pick(row, STATISTIC_FIELDS);

/** Both sides go through this, so `undefined`, `null` and `''` do not differ. */
const gameView = (game: TGameFinal, teams: { id: string }[]) => ({
  id: game.id,
  number: game.number,
  season: game.season,
  playedAt: new Date(game.playedAt).getTime(),
  status: game.status,
  link: game.link?.trim() ?? '',
  description: game.description?.trim() ?? '',
  notes: game.notes ?? ['', ''],
  teamIds: teams.map(team => team.id),
});

export function isNewGameChanged({
  initialGame,
  actualGame,
  actualTeams,
  actualStatistics,
}: {
  initialGame: TGameFinal;
  actualGame: TGameFinal;
  actualTeams: TTeamFinal[];
  actualStatistics: TPlayerStatisticFinal[];
}): boolean {
  return (
    !isEqual(
      gameView(initialGame, initialGame.teams),
      gameView(actualGame, actualTeams),
    ) ||
    // The order of the rows counts: it is the order of the lineup
    !isEqual(
      initialGame.statistics.map(statisticView),
      actualStatistics.map(statisticView),
    )
  );
}
