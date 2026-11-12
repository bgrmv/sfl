import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild, OnInit, AfterViewInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { CaptainsStore, TCaptain } from '@entities/captains';

@Component({
  selector: 'sfl-captains-table',
  standalone: true,
  templateUrl: './captains-table.component.html',
  styleUrls: ['./captains-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class CaptainsTableComponent implements OnInit, AfterViewInit {
  constructor(
    private _destroyRef: DestroyRef,
    private captainsStore: CaptainsStore,
  ) {}

  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.captainsStore.captains$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(captains => {
        this.dataSource.data = captains;
      });
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
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
