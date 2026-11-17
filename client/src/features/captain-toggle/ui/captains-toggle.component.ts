import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { TCaptain } from '@entities/captain';
import { PlayersStore } from '@entities/player';

import { sortedTableSource } from '@shared/lib/sorted-table-source';
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
export class CaptainsToggleComponent {
  private playersStore = inject(PlayersStore);

  readonly sort = viewChild(MatSort);
  readonly dataSource = sortedTableSource(
    this.playersStore.captains,
    this.sort,
  );
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
