import type { PlayerStatisticDTO } from '@sfl/schemas';
import type { TPlayerFinal } from '@entities/player/@x/game';

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

/** A row of the statistics table of a game; `key` names the column. */
export type GamePlayerStatistic = TPlayerStatisticFinal & {
  key?: TPlayerStatisticFinalNumberKeys;
};
