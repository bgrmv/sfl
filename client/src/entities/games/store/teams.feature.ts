import {
  patchState,
  signalStoreFeature,
  type,
  withHooks,
  withMethods,
} from '@ngrx/signals';
import {
  entityConfig,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { TTeamFinal } from '../types';
import { NewGameState } from './new-game.store';

export const NEW_GAME_TEAMS_ENTITY_CONFIG = entityConfig({
  entity: type<TTeamFinal>(),
  collection: 'teams',
  selectId: team => team.id,
});

const FEATURE_NAME = 'TEAMS';

const FEATURE_INITIALIZED = `[${FEATURE_NAME} STORE FEATURE] has been initialized 🚀`;

const FEATURE_DESTROYED = `[${FEATURE_NAME} STORE FEATURE] destroyed 💥`;

export function withTeamsFeature() {
  return signalStoreFeature(
    {
      state: type<NewGameState>(),
    },
    withEntities(NEW_GAME_TEAMS_ENTITY_CONFIG),
    withMethods(store => ({
      updateTeams(teams: [TTeamFinal, TTeamFinal]): void {
        patchState(store, setAllEntities(teams, NEW_GAME_TEAMS_ENTITY_CONFIG));
      },
      initTeamsEntity(teams: TTeamFinal[]): void {
        patchState(store, setAllEntities(teams, NEW_GAME_TEAMS_ENTITY_CONFIG));
      },
    })),
    withHooks({
      onInit() {
        console.info(FEATURE_INITIALIZED);
      },
      onDestroy() {
        console.info(FEATURE_DESTROYED);
      },
    }),
  );
}
