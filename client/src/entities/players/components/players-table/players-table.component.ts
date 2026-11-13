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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { CaptainsService } from '@entities/captains';
import { TPlayerFinal } from '@entities/games/types';
import { PlayersStore } from '@entities/players';
import { PlayerDeleteDialogComponent } from '@entities/players/components/player-delete-dialog/player-delete-dialog.component';
import { PlayerEditDialogComponent } from '@entities/players/components/player-edit-dialog/player-edit-dialog.component';
import { NilToDashPipe } from '@shared/pipes/nil-to-dash.pipe';
import { AuthService } from '@shared/services/auth.service';

@Component({
  selector: 'sfl-players-table',
  templateUrl: './players-table.component.html',
  styleUrls: ['./players-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatProgressBarModule,
    NilToDashPipe,
  ],
  providers: [
    // Fixme: CaptainsStore uses CaptainsService, idk how to fix this
    // https://angular.io/api/core/FactoryProvider
    CaptainsService,
    // To use CaptainsService - useEffects
    // provideComponentStore(PlayersStore),
  ],
})
export class PlayersTableComponent implements OnDestroy, AfterViewInit {
  private _destroyRef = inject(DestroyRef);

  private dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly playersStore = inject(PlayersStore);
  private readonly authService = inject(AuthService);

  public user = this.authService.user();
  public isAdminSignal = this.authService.isAdmin;

  protected readonly loading = this.playersStore.loading;

  playersEffectRef = effect(() => {
    this.dataSource.data = this.playersStore.playersEntities();
  });

  @ViewChild(MatSort) sort!: MatSort;

  ngOnDestroy() {
    this.playersEffectRef.destroy();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  readonly dataSource = new MatTableDataSource<TPlayerFinal>([]);
  readonly displayedColumns: (
    | keyof TPlayerFinal
    | 'actions'
    | 'name'
    | 'surname'
  )[] = [
    'avatar',
    'number',

    'name',
    'surname',
    'nickname',
    'isCaptain',

    // 'totalGames',
    // 'wonGames',
    // 'lostGames',
    // 'draws',

    // 'maxWinStreak',
    // 'maxLostStreak',

    'actions',

    // TBC
    // playsForA: number
    // playsForB: number

    // season[number]: + / - points
    // season[number]: + / - points
    // season[number]: + / - points
  ];

  openPlayerDetailsPage(id: string) {
    this.router.navigate(['players', id]);
  }

  editPlayer(player: TPlayerFinal) {
    this.dialog
      .open(PlayerEditDialogComponent, {
        data: player,
      })
      .afterClosed()
      .subscribe(player => {
        if (player) {
          this.playersStore.updateOne(player);
        }
      });
  }

  deletePlayer(player: TPlayerFinal) {
    this.dialog
      .open(PlayerDeleteDialogComponent, {
        data: { player },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.playersStore.deleteOne(player.id);
        }
      });
  }
}
