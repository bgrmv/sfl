import { computed, inject } from '@angular/core';
import { PlayersService } from '../api/players.service';
import {
  patchState,
  signalStoreFeature,
  withComputed,
  withMethods,
} from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
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
import { pipe, switchMap, tap } from 'rxjs';
import { PLAYERS_ENTITY_CONFIG } from './players.entity';

/** Query side: the list of players, its status and what is derived from it. */
export function withPlayersQueries() {
  return signalStoreFeature(
    withRequestStatus(),
    withEntities(PLAYERS_ENTITY_CONFIG),
    withComputed(({ playersEntities }) => ({
      captains: computed(() =>
        playersEntities().filter(({ isCaptain }) => Boolean(isCaptain)),
      ),
    })),
    withMethods(
      (
        store,
        playersService = inject(PlayersService),
        notify = injectNotifier(),
      ) => ({
        /** Loads the list; can be called again, a failure does not kill it. */
        load: rxMethod<void>(
          pipe(
            tap(() => patchState(store, setPending())),
            switchMap(() =>
              playersService.find().pipe(
                toResult(),
                tapResult({
                  ok: players =>
                    patchState(
                      store,
                      setAllEntities(players, PLAYERS_ENTITY_CONFIG),
                      setFulfilled(),
                    ),
                  err: error =>
                    patchState(store, setError(notify.error(error))),
                }),
              ),
            ),
          ),
        ),
      }),
    ),
  );
}
