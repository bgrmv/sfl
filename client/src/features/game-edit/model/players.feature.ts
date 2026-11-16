import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { IPlayerDTO, TPlayerFinal } from '@entities/player';
import { NewGameState } from './new-game.state';

const PLAYERS_ENTITY_CONFIG = entityConfig({
  entity: type<TPlayerFinal>(),
  collection: 'players',
  selectId: player => player.id,
});

export function withPlayersFeature() {
  return signalStoreFeature(
    {
      state: type<NewGameState>(),
    },
    withEntities(PLAYERS_ENTITY_CONFIG),
    withMethods(store => ({
      addPlayer(player: IPlayerDTO): void {
        patchState(
          store,
          // state => ({ players: [...state.players, ] }),
          addEntity(player, PLAYERS_ENTITY_CONFIG),
        );
      },
      initEntityPlayers(players: TPlayerFinal[]): void {
        patchState(store, setAllEntities(players, PLAYERS_ENTITY_CONFIG));
      },
    })),
  );
}
