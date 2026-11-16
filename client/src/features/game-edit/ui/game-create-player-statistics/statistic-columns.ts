import { TPlayerStatisticFinalNumberKeys } from '@entities/game';
import { GamePlayerStatistic } from './game-create-player-statistics.component';

export type StatisticColumn = {
  columnDef: string;
  header: string;
  cell: (element: GamePlayerStatistic) => string;
  key?: TPlayerStatisticFinalNumberKeys;
};

export const GAME_PLAYER_STATISTICS_COLUMNS: StatisticColumn[] = [
  {
    columnDef: 'order',
    header: 'order',
    cell: () => `#`,
  },

  {
    columnDef: 'nickname',
    header: 'Nickname',
    cell: (element: GamePlayerStatistic) => `${element.playerData.nickname}`,
  },
  {
    columnDef: 'passes',
    key: 'passes',
    header: 'Passes',
    cell: (element: GamePlayerStatistic) => `${element.passes}`,
  },
  {
    columnDef: 'goalsByLeg',
    key: 'goalsByLeg',
    header: 'Goal',
    cell: (element: GamePlayerStatistic) => `${element.goalsByLeg}`,
  },
  {
    columnDef: 'goalsByHead',
    key: 'goalsByHead',
    header: 'Goal head',
    cell: (element: GamePlayerStatistic) => `${element.goalsByHead}`,
  },
  // {
  //   columnDef: 'goalsByAuto',
  //   key: 'goalsByAuto',
  //   header: 'Autogoal',
  //   cell: (element: GamePlayerStatistic) => `${element.goalsByAuto}`,
  // },
  {
    columnDef: 'goalsByPenalty',
    key: 'goalsByPenalty',
    header: 'Penalty',
    cell: (element: GamePlayerStatistic) => `${element.goalsByPenalty}`,
  },
  {
    columnDef: 'position',
    header: 'Position',
    cell: (element: GamePlayerStatistic) => `${element.position}`,
  },
  {
    columnDef: 'isCaptain',
    header: 'C',
    cell: (element: GamePlayerStatistic) => `${element.isCaptain}`,
  },
  {
    columnDef: 'isMVP',
    header: 'MVP',
    cell: (element: GamePlayerStatistic) => `${element.isMVP}`,
  },

  {
    columnDef: 'isTransfer',
    header: '<->',
    cell: (element: GamePlayerStatistic) => `${element.isTransfer}`,
  },
];
