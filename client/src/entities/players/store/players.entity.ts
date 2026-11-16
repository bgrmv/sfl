import { TPlayerFinal } from '@entities/games/types';
import { type } from '@ngrx/signals';
import { entityConfig } from '@ngrx/signals/entities';

export const PLAYERS_ENTITY_CONFIG = entityConfig({
  entity: type<TPlayerFinal>(),
  collection: 'players',
  selectId: player => player.id,
});
