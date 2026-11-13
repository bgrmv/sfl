// TODO X imports - isolate

import {
  EnumPlayerPosition,
  type GameDTO,
  type PlayerDTO,
  type PlayerStatisticDTO,
  type TeamDTO,
} from '@sfl/schemas';
import { EnumGameStatus } from './constants';

// Game
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

// Team
export interface ITeamSettings {}
// The shape of the API, declared once in @sfl/schemas
export type ITeamDTO = TeamDTO;
export type TTeamFinal = ITeamDTO & ITeamSettings;

// Players
export interface IPlayerSettings {}
export type IPlayerDTO = PlayerDTO;
export type TPlayerFinal = IPlayerDTO & IPlayerSettings;

// Statistic
export { EnumPlayerPosition };

export interface IPlayerStatisticSettings {
  id: string;
  playerData: TPlayerFinal;
}

export type IPlayerStatisticDTO = PlayerStatisticDTO;

export type TPlayerStatisticFinal = IPlayerStatisticDTO &
  IPlayerStatisticSettings;
export type TPlayerStatisticFinalIds = Pick<
  TPlayerStatisticFinal,
  'playerId' | 'teamId'
>;
export type TPlayerStatisticFinalNumber = Pick<
  TPlayerStatisticFinal,
  'passes' | 'goalsByLeg' | 'goalsByHead' | 'goalsByAuto' | 'goalsByPenalty'
>;
export type TPlayerStatisticFinalNumberKeys = keyof TPlayerStatisticFinalNumber;

export type TPlayerStatisticFinalBoolean = Pick<
  TPlayerStatisticFinal,
  'isMVP' | 'isCaptain' | 'isTransfer'
>;
export type TPlayerStatisticFinalBooleanKeys =
  keyof TPlayerStatisticFinalBoolean;
export type TGamePlayerStatisticFinal = TPlayerStatisticFinalBoolean &
  TPlayerStatisticFinalNumber &
  Partial<TPlayerStatisticFinalIds> &
  Partial<IPlayerStatisticSettings>;
