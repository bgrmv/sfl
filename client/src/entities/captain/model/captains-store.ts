import { computed, inject } from '@angular/core';
import { TeamEnum } from '@shared/constants/team';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '@shared/store/with-request-status';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { toResult } from '@shared/api/to-result';
import { injectNotifier } from '@shared/store/inject-notifier';
import { tapResult } from '@shared/store/tap-result';
import { from, pipe, switchMap, tap } from 'rxjs';
import { CaptainsService } from '../api/captains.service';
import { TCaptain, TCaptainSelected } from './captain';

export interface CaptainsState {
  captains: TCaptain[];
  selected: TCaptainSelected[];
}

const INITIAL_CAPTAINS_STATE: CaptainsState = {
  captains: [],
  selected: [],
};

export const CaptainsStore = signalStore(
  withState(INITIAL_CAPTAINS_STATE),
  withRequestStatus(),
  withComputed(({ captains, selected }) => ({
    captainsWithoutTeam: computed(() => {
      const selectedIds = selected().map(select => select.id);
      return captains().filter(captain => !selectedIds.includes(captain.id));
    }),
  })),
  withMethods(
    (
      store,
      captainsService = inject(CaptainsService),
      notify = injectNotifier(),
    ) => ({
      /** Loads the captains; an error is kept in the state, a retry works. */
      load: rxMethod<void>(
        pipe(
          tap(() => patchState(store, setPending())),
          switchMap(() =>
            from(captainsService.getCaptains()).pipe(
              toResult(),
              tapResult({
                ok: captains => patchState(store, { captains }, setFulfilled()),
                err: error => patchState(store, setError(notify.error(error))),
              }),
            ),
          ),
        ),
      ),
      add(captain: TCaptain): void {
        patchState(store, state => ({
          captains: [...state.captains, captain],
        }));
      },
      delete(id: string): void {
        patchState(store, state => ({
          captains: state.captains.filter(captain => captain.id !== id),
        }));
      },
      addSelected({ id, team }: { id: string; team: TeamEnum }): void {
        patchState(store, state => {
          const found = state.captains.find(captain => captain.id === id);
          if (!found) {
            return state;
          }
          return {
            selected: [
              ...state.selected.filter(selected => selected.team !== team),
              { ...found, team },
            ],
          };
        });
      },
      deleteSelected(id: string): void {
        patchState(store, state => ({
          selected: state.selected.filter(captain => captain.id !== id),
        }));
      },
      toggleCaptain({
        id,
        isCaptain,
      }: {
        id: string;
        isCaptain: boolean;
      }): void {
        patchState(store, state => ({
          captains: state.captains.map(captain =>
            captain.id === id ? { ...captain, isCaptain } : captain,
          ),
        }));
      },
    }),
  ),
  withHooks({
    onInit({ load }) {
      load();
    },
  }),
);
