import { computed } from '@angular/core';
import { signalStore, withComputed, withHooks } from '@ngrx/signals';
import { withPlayersQueries } from './players.queries';

/**
 * Read-only players WITH the statistics (`metadata`: by game, by season, career).
 * For the ranking, the player page and the captains; the heavy answer is why it is not the
 * list store. Provide it per page.
 */
export const PlayersStatsStore = signalStore(
  withPlayersQueries({ includeMetadata: true }),
  withComputed(({ isPending, requestStatus }) => ({
    loading: computed(() => isPending() || requestStatus() === 'idle'),
  })),
  withHooks({
    onInit({ load }) {
      load();
    },
  }),
);
