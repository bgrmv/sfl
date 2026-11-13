import { EnumGameStatus as EnumApiGameStatus } from '@sfl/schemas';

// The statuses of the API (@sfl/schemas) plus `Furture`: a client-only status of
// the placeholder card of a game that is not played yet. It never reaches the API.
export const EnumGameStatus = {
  ...EnumApiGameStatus,
  Furture: 'furture',
} as const;
export type EnumGameStatus =
  (typeof EnumGameStatus)[keyof typeof EnumGameStatus];

export enum EnumGameMode {
  Init = 'init',
  Create = 'create',
  Edit = 'edit',
  Unknown = 'unknown',
}
