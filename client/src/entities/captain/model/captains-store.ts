import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TeamEnum } from '@shared/constants/team';
import { TCaptainSelection } from './captain';

export interface CaptainsState {
  selected: TCaptainSelection[];
}

/**
 * The choice of captains by team. The captains themselves are the players
 * with `isCaptain` in `PlayersStore`: there is one list, not two (S3.25).
 */
export const CaptainsStore = signalStore(
  withState<CaptainsState>({ selected: [] }),
  withMethods(store => ({
    /** One captain per team: a new choice replaces the old one. */
    addSelected({ id, team }: { id: string; team: TeamEnum }): void {
      patchState(store, state => ({
        selected: [
          ...state.selected.filter(selected => selected.team !== team),
          { id, team },
        ],
      }));
    },
    deleteSelected(id: string): void {
      patchState(store, state => ({
        selected: state.selected.filter(captain => captain.id !== id),
      }));
    },
  })),
);
