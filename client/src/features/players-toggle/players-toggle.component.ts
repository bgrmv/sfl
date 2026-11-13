import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TPlayerFinal } from '@entities/games/types';
import { PlayersStore } from '@entities/players';

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
export class PlayersToggleComponent implements OnDestroy, AfterViewInit {
  private _destroyRef = inject(DestroyRef);

  readonly playersStore = inject(PlayersStore);

  readonly playersEffectRef = effect(() => {
    this.dataSource.data = this.playersStore.players();
  });

  @ViewChild(MatSort) sort!: MatSort;

  readonly dataSource = new MatTableDataSource<TPlayerFinal>([]);
  readonly displayedColumns: (keyof TPlayerFinal | 'actions')[] = [
    'avatar',
    // 'name',
    // 'surname',
    'nickname',
    'actions',
  ];

  ngOnDestroy() {
    this.playersEffectRef.destroy();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  toggleCaptain(player: TPlayerFinal) {
    this.playersStore.patch(player);
  }
}
