import { TeamEnum } from '@shared/constants/team';

/**
 * What the captain cards and tables need. A captain is a player with
 * `isCaptain`, so a player from `PlayersStore` fits this type as it is;
 * the stats come only when the server sends them.
 */
export type TCaptain = {
  id: string;
  avatar?: number | string;

  number?: number;
  nickname: string;

  isCaptain: boolean;
  totalGames?: number;
  draws?: number;
  lostGames?: number;
  wonGames?: number;
  maxWinStreak?: number;
  maxLostStreak?: number;
  team?: TeamEnum;
};

/** The captain chosen for a team of the game being created. */
export type TCaptainSelection = { id: string; team: TeamEnum };
