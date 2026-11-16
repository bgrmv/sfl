import { TeamEnum } from '@shared/constants/team';

export type TCaptain = {
  id: string;
  avatar: number;

  number: number;
  nickname: string;
  // name: string;
  // surname: string;

  isCaptain: boolean;
  totalGames: number;
  draws: number;
  lostGames: number;
  wonGames: number;
  maxWinStreak: number;
  maxLostStreak: number;
  team?: TeamEnum;
};

export type TCaptainSelected = Required<TCaptain>;
