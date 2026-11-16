import {
  ChangeDetectionStrategy,
  Component,
  AfterViewInit,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { TCaptain } from '@entities/captain';
import { PlayersStore } from '@entities/player';

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
export class CaptainsTableComponent implements AfterViewInit {
  private playersStore = inject(PlayersStore);

  readonly sort = viewChild.required(MatSort);

  constructor() {
    effect(() => {
      this.dataSource.data = this.playersStore.captains();
    });
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort();
  }

  readonly dataSource = new MatTableDataSource<TCaptain>([]);
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
