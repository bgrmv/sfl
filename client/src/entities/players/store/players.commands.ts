import { computed, inject } from '@angular/core';
import { TPlayerFinal } from '@entities/games/types';
import { PlayersService } from '@entities/players/services/players.service';
import {
  patchState,
  signalStoreFeature,
  type,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  updateEntity,
  type NamedEntityState,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { toResult } from '@shared/api/to-result';
import { injectNotifier } from '@shared/store/inject-notifier';
import { tapResult } from '@shared/store/tap-result';
import {
  EMPTY,
  Observable,
  concatMap,
  defer,
  filter,
  finalize,
  pipe,
  tap,
} from 'rxjs';
import { PLAYERS_ENTITY_CONFIG } from './players.entity';

/**
 * Command side: every change of a player is one request, then one write into
 * the state, then one notification. `pending` counts the commands that are
 * queued or running, so `mutating` stays true until the last one is done.
 */
export function withPlayersCommands() {
  return signalStoreFeature(
    { state: type<NamedEntityState<TPlayerFinal, 'players'>>() },
    withState({ pending: 0 }),
    withComputed(({ pending }) => ({
      mutating: computed(() => pending() > 0),
    })),
    withMethods(
      (
        store,
        playersService = inject(PlayersService),
        notify = injectNotifier(),
      ) => {
        const queued = () =>
          patchState(store, state => ({ pending: state.pending + 1 }));
        const done = () =>
          patchState(store, state => ({ pending: state.pending - 1 }));

        /** One command: request, write on success, report on failure. */
        const run = <T>(
          request$: Observable<T>,
          ok: (value: T) => void,
        ): Observable<unknown> =>
          request$.pipe(
            toResult(),
            tapResult({ ok, err: notify.error }),
            finalize(done),
          );

        const deleting = new Set<string>();

        return {
          add(player: TPlayerFinal): void {
            patchState(store, addEntity(player, PLAYERS_ENTITY_CONFIG));
          },

          updateOne: rxMethod<{
            id: string;
            changes: Partial<TPlayerFinal>;
            message?: string;
          }>(
            pipe(
              tap(queued),
              concatMap(({ id, changes, message = 'Player saved' }) =>
                run(playersService.patch(id, changes), patched => {
                  patchState(
                    store,
                    updateEntity(
                      {
                        id,
                        changes: (patched ?? changes) as Partial<TPlayerFinal>,
                      },
                      PLAYERS_ENTITY_CONFIG,
                    ),
                  );
                  notify.success(message);
                }),
              ),
            ),
          ),

          /** Flips the captain flag from the value in the store at that moment. */
          toggleCaptain: rxMethod<string>(
            pipe(
              tap(queued),
              concatMap(id =>
                defer(() => {
                  const current = store.playersEntityMap()[id];
                  if (!current) {
                    done();
                    return EMPTY;
                  }
                  return run(
                    playersService.patch(id, { isCaptain: !current.isCaptain }),
                    patched => {
                      patchState(
                        store,
                        updateEntity(
                          {
                            id,
                            changes: (patched ?? {
                              isCaptain: !current.isCaptain,
                            }) as Partial<TPlayerFinal>,
                          },
                          PLAYERS_ENTITY_CONFIG,
                        ),
                      );
                      notify.success('Captain updated');
                    },
                  );
                }),
              ),
            ),
          ),

          /** A second delete of the same player while the first runs is ignored. */
          deleteOne: rxMethod<string>(
            pipe(
              filter(id => !deleting.has(id)),
              tap(id => {
                deleting.add(id);
                queued();
              }),
              concatMap(id =>
                run(playersService.delete(id), () => {
                  patchState(store, removeEntity(id, PLAYERS_ENTITY_CONFIG));
                  notify.success('Player deleted');
                }).pipe(finalize(() => deleting.delete(id))),
              ),
            ),
          ),
        };
      },
    ),
  );
}
