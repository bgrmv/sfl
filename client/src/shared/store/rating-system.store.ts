import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export const RATING_SYSTEMS = ['Ancient', 'Positional'] as const;
export type RatingSystemName = (typeof RATING_SYSTEMS)[number];
export const RATING_SYSTEM_KEY = 'sfl.ratingSystem';

function stored(): RatingSystemName {
  try {
    const value = localStorage.getItem(RATING_SYSTEM_KEY);
    return RATING_SYSTEMS.includes(value as RatingSystemName)
      ? (value as RatingSystemName)
      : 'Ancient';
  } catch {
    return 'Ancient';
  }
}

/**
 * The rating system is chosen once, in the header, and every ranking follows it
 * (feature-review P14, board SystemSelect). The choice is a per-browser preference.
 */
export const RatingSystemStore = signalStore(
  { providedIn: 'root' },
  withState(() => ({ system: stored() })),
  withMethods(store => ({
    choose(system: RatingSystemName) {
      patchState(store, { system });
      try {
        localStorage.setItem(RATING_SYSTEM_KEY, system);
      } catch {
        // a blocked storage only loses the memory of the choice
      }
    },
  })),
);
