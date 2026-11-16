import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import {
  entityConfig,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { TTeamFinal } from '../../types';
import { NewGameState } from './new-game.state';

export const NEW_GAME_TEAMS_ENTITY_CONFIG = entityConfig({
  entity: type<TTeamFinal>(),
  collection: 'teams',
  selectId: team => team.id,
});

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
  );
}
