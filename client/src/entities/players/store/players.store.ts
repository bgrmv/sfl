import { computed } from '@angular/core';
import { signalStore, withComputed, withHooks } from '@ngrx/signals';
import { withPlayersCommands } from './players.commands';
import { withPlayersQueries } from './players.queries';

/** The players of the league: queries read, commands write (CQRS). */
export const PlayersStore = signalStore(
  withPlayersQueries(),
  withPlayersCommands(),
  withComputed(({ isPending, requestStatus, mutating }) => ({
    loading: computed(
      () => isPending() || requestStatus() === 'idle' || mutating(),
    ),
  })),
  withHooks({
    onInit({ load }) {
      load();
    },
  }),
);
