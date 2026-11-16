import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { TPlayerStatisticFinal } from '@entities/game';
import { DEFAULT_STATISTIC_VALUES, NewGameStore } from '@features/game-edit';
import {
  PlayersAutocompleteComponent,
  type PlayerOption,
} from '@features/player-select';
import { CreatePlayerDialogComponent } from '@features/player-create';

type PlayerRow = Partial<TPlayerStatisticFinal> & TPlayerStatisticFinal;

/**
 * Connects the player autocomplete to the game form: the page owns this glue,
 * so the two features do not import each other (FSD, ADR 0016).
 */
@Component({
  selector: 'sfl-team-players-autocomplete',
  imports: [PlayersAutocompleteComponent],
  template: `
    <sfl-players-autocomplete
      [options]="options()"
      (picked)="pick($event)"
      (removed)="remove($event)"
      (createRequested)="createPlayer()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPlayersAutocompleteComponent {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(NewGameStore);

  public readonly teamId = input.required<string>();

  /** Statistics of the team and of the opponents; the first team is the first side. */
  private readonly sides = computed(() => {
    const isFirstTeam = this.teamId() === this.store.teamsEntities().at(0)!.id;
    const bmw = this.store.statisticsBMW() ?? [];
    const honda = this.store.statisticsHONDA() ?? [];
    return isFirstTeam
      ? { alias: bmw, opponents: honda }
      : { alias: honda, opponents: bmw };
  });

  /** A row per player: his statistic of the team, or an empty one. */
  private readonly rows = computed<PlayerRow[]>(() => {
    const { alias, opponents } = this.sides();
    const opponentIds = opponents.map(({ playerId }) => playerId);

    return this.store
      .playersEntities()
      .filter(player => !opponentIds.includes(player.id))
      .map(
        player =>
          alias.find(statistic => statistic.playerId === player.id) ??
          ({
            ...DEFAULT_STATISTIC_VALUES,
            id: player.id,
            playerId: player.id,
            playerData: player,
          } as PlayerRow),
      );
  });

  protected readonly options = computed<PlayerOption[]>(() =>
    this.rows().map(row => ({
      id: row.id,
      nickname: row.playerData.nickname,
      number: row.playerData.number,
      name: row.playerData.user?.name,
      surname: row.playerData.user?.surname,
      selected: !!row.teamId,
    })),
  );

  protected pick(id: string): void {
    const statistic = this.rows().find(row => row.id === id);
    if (!statistic) {
      return;
    }
    // The first player of a team is its captain
    const isCaptain = this.sides().alias.length === 0;
    this.store.addStatisticPlayer({
      ...statistic,
      isCaptain,
      teamId: this.teamId(),
    });
  }

  protected remove(id: string): void {
    this.store.removeStatisticPlayer(id);
  }

  protected createPlayer(): void {
    this.dialog
      .open(CreatePlayerDialogComponent, { width: '600px' })
      .afterClosed()
      .subscribe(player => {
        if (player) {
          this.store.addPlayer(player);
        }
      });
  }
}
