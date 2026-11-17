import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { GameListStatisticsPipe, GameStore, TGameFinal } from '@entities/game';

import { sortedTableSource } from '@shared/lib/sorted-table-source';
@Component({
  selector: 'sfl-games-table',
  standalone: true,
  templateUrl: './games-table.component.html',
  styleUrls: ['./games-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    GameListStatisticsPipe,
  ],
  providers: [],
})
export class GamesTableComponent {
  readonly gameStore = inject(GameStore);

  readonly loadingSingal = this.gameStore.loading;

  readonly sort = viewChild(MatSort);
  readonly dataSource = sortedTableSource(this.gameStore.games, this.sort);
  readonly displayedColumns: (keyof TGameFinal | 'result')[] = [
    'season',
    'number',
    'status',
    'result',
    'playedAt',
  ];
}
