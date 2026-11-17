import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { TCaptain } from '@entities/captain';
import { PlayersStore } from '@entities/player';

import { sortedTableSource } from '@shared/lib/sorted-table-source';
@Component({
  selector: 'sfl-captains-table',
  templateUrl: './captains-table.component.html',
  styleUrls: ['./captains-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class CaptainsTableComponent {
  private playersStore = inject(PlayersStore);

  readonly sort = viewChild(MatSort);
  readonly dataSource = sortedTableSource(
    this.playersStore.captains,
    this.sort,
  );
  readonly displayedColumns: (keyof TCaptain)[] = [
    'avatar',
    // 'name',
    // 'surname',
    'nickname',

    'totalGames',
    'wonGames',
    'lostGames',
    'draws',

    'maxWinStreak',
    'maxLostStreak',

    // TBC
    // playsForA: number
    // playsForB: number

    // season[number]: + / - points
    // season[number]: + / - points
    // season[number]: + / - points
  ];
}
