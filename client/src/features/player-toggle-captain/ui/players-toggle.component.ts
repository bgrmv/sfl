import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { TPlayerFinal } from '@entities/player';
import { PlayersStore } from '@entities/player';

import { sortedTableSource } from '@shared/lib/sorted-table-source';
@Component({
  selector: 'sfl-players-toggle',
  imports: [
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './players-toggle.component.html',
  styleUrls: ['./players-toggle.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayersToggleComponent {
  private _destroyRef = inject(DestroyRef);

  readonly playersStore = inject(PlayersStore);

  readonly sort = viewChild(MatSort);
  readonly dataSource = sortedTableSource(
    this.playersStore.playersEntities,
    this.sort,
  );
  readonly displayedColumns: (keyof TPlayerFinal | 'actions')[] = [
    'avatar',
    // 'name',
    // 'surname',
    'nickname',
    'actions',
  ];

  toggleCaptain(player: TPlayerFinal) {
    this.playersStore.toggleCaptain(player.id);
  }
}
