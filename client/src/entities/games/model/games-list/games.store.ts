import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  entityConfig,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { toResult } from '@shared/api/to-result';
import { injectNotifier } from '@shared/store/inject-notifier';
import { tapResult } from '@shared/store/tap-result';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '@shared/store/with-request-status';
import { concatMap, filter, finalize, pipe, switchMap, tap } from 'rxjs';
import { GameService } from '../../services/game.service';
import { IGameDTO } from '../../types';
import { buildSeasonCards, placeholderCard } from './season-cards';

export interface TGamesStore {
  season: number;
}

const GAMES_ENTITY_CONFIG = entityConfig({
  entity: type<IGameDTO>(),
  collection: 'games',
  selectId: game => game.id,
});

export const GamesStore = signalStore(
  withState<TGamesStore>({ season: new Date().getFullYear() }),
  withRequestStatus(),
  withEntities(GAMES_ENTITY_CONFIG),
  withComputed(({ isPending }) => ({ loading: isPending })),
  withProps(() => ({ deleting: new Set<string>() })),
  withMethods(
    (
      store,
      gameService = inject(GameService),
      notify = injectNotifier(),
      { deleting } = store,
    ) => ({
      /**
       * Deletes on the server, then turns the game into a placeholder card.
       * A second delete of the same game while the first runs is ignored.
       */
      deleteGame: rxMethod<IGameDTO>(
        pipe(
          filter(game => !deleting.has(game.id)),
          tap(game => deleting.add(game.id)),
          concatMap(game =>
            gameService.delete(game.id).pipe(
              toResult(),
              tapResult({
                ok: () => {
                  patchState(
                    store,
                    updateEntity(
                      { id: game.id, changes: () => placeholderCard(game) },
                      GAMES_ENTITY_CONFIG,
                    ),
                  );
                  notify.success('Game deleted');
                },
                err: notify.error,
              }),
              finalize(() => deleting.delete(game.id)),
            ),
          ),
        ),
      ),

      updateSeason(season: number) {
        patchState(store, { season });
      },

      /** `switchMap` drops the answer of a previous season. */
      initGamesStore: rxMethod<{ season: number }>(
        pipe(
          tap(() => patchState(store, setPending())),
          switchMap(({ season }) =>
            gameService.find({ season }).pipe(
              toResult(),
              tapResult({
                ok: games =>
                  patchState(
                    store,
                    setAllEntities(
                      buildSeasonCards(games, season),
                      GAMES_ENTITY_CONFIG,
                    ),
                    setFulfilled(),
                  ),
                err: error => patchState(store, setError(notify.error(error))),
              }),
            ),
          ),
        ),
      ),
    }),
  ),
);
