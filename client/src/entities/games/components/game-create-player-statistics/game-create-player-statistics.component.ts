import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  Signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NewGameStore } from '@entities/games/store/new-game.store';
import {
  EnumPlayerPosition,
  TPlayerStatisticFinal,
  TPlayerStatisticFinalNumberKeys,
} from '@entities/games/types';
import { PlayerClient } from '@entities/players';
import { GAME_PLAYER_STATISTICS_COLUMNS } from './constants';

// There was GamePlayer
export type GamePlayerStatistic = TPlayerStatisticFinal & {
  key?: TPlayerStatisticFinalNumberKeys;
};

@Component({
  selector: 'sfl-game-create-player-statistics',
  imports: [
    MatIconModule,
    MatTooltipModule,
    MatTableModule,
    MatSlideToggleModule,
    DragDropModule,
  ],
  templateUrl: './game-create-player-statistics.component.html',
  styleUrl: './game-create-player-statistics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCreatePlayerStatisticsComponent {
  private readonly newGameStore = inject(NewGameStore);

  public teamId = input.required<string>();

  protected readonly enumPlayerPosition = EnumPlayerPosition;
  protected readonly columns = GAME_PLAYER_STATISTICS_COLUMNS;
  protected readonly displayedColumns = this.columns.map(c => c.columnDef);

  protected statistics = computed(() => {
    return this.teamId() === this.newGameStore.teamsEntities().at(0)?.id
      ? this.newGameStore.statisticsBMW()
      : this.newGameStore.statisticsHONDA();
  });

  protected readonly swapEnabled = this.newGameStore.swapEnabled;

  protected readonly dataSource: Signal<
    (Pick<PlayerClient, 'nickname'> & TPlayerStatisticFinal)[]
  > = computed(() => {
    // TODO: make it litgher

    const players = this.newGameStore.playersEntities();

    if (!players.length) {
      return [];
    }

    const statisticPlayers = this.statistics().map(stat => {
      const found = players.find(player => {
        return player.id === stat.playerId;
      })!;

      // TODO START HERE
      // TODO use playerData of statistics instead
      return {
        ...stat,
        nickname: found.nickname,
      };
    });

    return statisticPlayers;
  });

  public toggleIsCaptain(playerStatistic: GamePlayerStatistic) {
    this.newGameStore.toggleIsCaptain(playerStatistic);
  }

  public toggleIsMVP(playerStatistic: GamePlayerStatistic) {
    this.newGameStore.toggleIsMVP(playerStatistic);
  }

  public toggleIsTransfer(
    playerStatistic: GamePlayerStatistic,
    isTransfer: boolean,
  ) {
    this.newGameStore.toggleTransferable({
      ...playerStatistic,
      isTransfer,
    });
  }

  protected changePosition(
    statistic: GamePlayerStatistic,
    position: EnumPlayerPosition,
  ) {
    this.newGameStore.changePosition(statistic, position);
  }

  public patchStatistic(
    statistic: GamePlayerStatistic,
    key: TPlayerStatisticFinalNumberKeys,
    action: 'decrement' | 'increment',
  ) {
    const number = action === 'decrement' ? -1 : 1;

    this.newGameStore.patchNumberKeysStatistics({ statistic, key, number });
  }

  protected drop(event: CdkDragDrop<any>) {
    const statistics = this.statistics();

    const index = statistics.findIndex(stat => stat.id === event.item.data.id);

    const movedRow = statistics[index];
    statistics.splice(index, 1);
    statistics.splice(event.currentIndex, 0, movedRow);

    this.newGameStore.updateAllStatisticsByTeam({
      statistics,
      teamId: this.teamId(),
    });
  }
}
