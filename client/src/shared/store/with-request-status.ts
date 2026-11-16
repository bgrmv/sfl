import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals';
import {
  errorOf,
  isPending as isPendingStatus,
  type RequestStatusState,
} from '@shared/api/request-status';

/**
 * One state of a request for every store: `requestStatus` plus `isPending`,
 * `isFulfilled`, `error`. Change it with `setPending()`, `setFulfilled()`,
 * `setError(message)` inside `patchState`.
 */
export function withRequestStatus() {
  return signalStoreFeature(
    withState<RequestStatusState>({ requestStatus: 'idle' }),
    withComputed(({ requestStatus }) => ({
      isPending: computed(() => isPendingStatus(requestStatus())),
      isFulfilled: computed(() => requestStatus() === 'fulfilled'),
      error: computed(() => errorOf(requestStatus())),
    })),
  );
}

export const setPending = (): RequestStatusState => ({
  requestStatus: 'pending',
});
export const setFulfilled = (): RequestStatusState => ({
  requestStatus: 'fulfilled',
});
export const setError = (error: string): RequestStatusState => ({
  requestStatus: { error },
});
