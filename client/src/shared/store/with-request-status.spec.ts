import { TestBed } from '@angular/core/testing';
import { patchState, signalStore } from '@ngrx/signals';
import { describe, expect, it } from 'vitest';

import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from './with-request-status';

const TestStore = signalStore(
  { providedIn: 'root', protectedState: false },
  withRequestStatus(),
);

describe('withRequestStatus', () => {
  it('walks idle → pending → fulfilled / error', () => {
    const store = TestBed.inject(TestStore);
    expect(store.requestStatus()).toBe('idle');

    patchState(store, setPending());
    expect(store.isPending()).toBe(true);

    patchState(store, setError('down'));
    expect(store.error()).toBe('down');
    expect(store.isPending()).toBe(false);

    patchState(store, setFulfilled());
    expect(store.isFulfilled()).toBe(true);
    expect(store.error()).toBeNull();
  });
});
