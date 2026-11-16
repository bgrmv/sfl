import { EnumGameMode } from './game-mode';
import { TGameFinal, TPlayerStatisticFinal } from '@entities/game';
import { TTeamFinal } from '@entities/team';
import { createInitialGame } from './new-game.init';

// The state of the form of a game. Apart from the store, so the features
// (teams, players, statistics) can import it without a cycle.

export interface NewGameState {
  game: TGameFinal;
  // One level game fields;
  teams: [TTeamFinal, TTeamFinal] | [];
  statistics: TPlayerStatisticFinal[];

  // Needed to keep all players with specific state

  // For internal process
  loading: boolean;
  initLoading: boolean;
  /** A save request is in flight: blocks a second submit. */
  saving: boolean;
  initialValue: null | TGameFinal;
  mode: EnumGameMode;
}

export const INITIAL_NEW_GAME_STATE: NewGameState = {
  game: createInitialGame(),
  // players: [],

  // One level game fields
  teams: [],
  statistics: [],

  // For internal process
  loading: false,
  initLoading: true,
  saving: false,
  initialValue: null,
  mode: EnumGameMode.Init,
};
