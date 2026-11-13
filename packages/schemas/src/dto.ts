import type {
  EnumGameStatus,
  EnumPlayerPosition,
  EnumTeamColor,
} from './enums.js';

/** A team of a game as it travels over the API. */
export interface TeamDTO {
  id: string;
  name: string;
  color: EnumTeamColor;
  description?: string;
  logo?: string | null;
}

/**
 * What one player did in one game. A transfer has a row per team.
 * `position` is empty only in a game that is not published yet.
 */
export interface PlayerStatisticDTO {
  playerId: string;
  teamId: string;

  passes: number;
  goalsByLeg: number;
  goalsByHead: number;
  goalsByAuto: number;
  goalsByPenalty: number;

  isMVP: boolean;
  isCaptain: boolean;
  isTransfer: boolean;

  position: EnumPlayerPosition | null;
}

/**
 * The person behind a player. `id`, `email` and `surname` are sent to an ADMIN
 * only; everybody else gets `name` and `avatar` (S8.10).
 */
export interface PlayerUserDTO {
  id?: string;
  email?: string;
  name?: string;
  surname?: string;
  avatar?: string;
}

/** A player as it travels over the API. */
export interface PlayerDTO {
  id: string;
  nickname: string;
  number?: number;
  avatar?: string;
  isCaptain: boolean;
  user: PlayerUserDTO;
}

/**
 * A game as it travels over the API. Dates are ISO strings on the wire.
 * `metadata` is calculated by the server (GLOSSARY.md has the rules); its
 * shape is typed once the domain package exists (S3.1), until then it is `any`.
 */
export interface GameDTO {
  id: string;
  number: number;
  season: number;
  playedAt: string;
  createdAt?: string;
  updatedAt?: string;
  status: EnumGameStatus;
  teams: TeamDTO[];
  statistics: PlayerStatisticDTO[];
  link: string;
  description: string;
  notes: [string, string];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}
