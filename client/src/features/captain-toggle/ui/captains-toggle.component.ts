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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { TCaptain } from '@entities/captain';
import { PlayersStore } from '@entities/player';

@Component({
  selector: 'sfl-captains-toggle',
  templateUrl: './captains-toggle.component.html',
  styleUrls: ['./captains-toggle.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
})
export class CaptainsToggleComponent implements AfterViewInit {
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
  readonly displayedColumns: (keyof TCaptain | 'actions')[] = [
    'avatar',
    // 'name',
    // 'surname',
    'nickname',
    'actions',
  ];

  /** The flag is flipped from the value in the store, not from the event. */
  onToggle(id: string) {
    this.playersStore.toggleCaptain(id);
  }
}
