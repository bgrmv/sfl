import type { GameDTO } from '@sfl/schemas';
import type { ITeamDTO } from '@entities/team/@x/game';
import { EnumGameStatus } from './game-status';
import type { IPlayerStatisticDTO } from './game-statistic';

export interface IGameSettings {}
// The shape of the API is GameDTO (@sfl/schemas); the client keeps dates as Date
// and has the extra placeholder status of a game that is not played yet
export type IGameDTO = Omit<
  GameDTO,
  'playedAt' | 'createdAt' | 'updatedAt' | 'status' | 'teams' | 'statistics'
> & {
  playedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  status: EnumGameStatus;
  teams: ITeamDTO[];
  statistics: IPlayerStatisticDTO[];
};

export type TGameFinal = SetOptional<IGameDTO, 'id'> & IGameSettings;

export type TGameFinalWithoutStatistics = Omit<TGameFinal, 'statistics'>;
