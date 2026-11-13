import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Optional,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { IPlayerDTO } from '@entities/games/types';
import { PlayersStore } from '@entities/players/store/players.store';
import { CreatePlayerDialogComponent } from '../create-player-dialog/create-player-dialog.component';

@Component({
    selector: 'sfl-player-create-button',
    imports: [CommonModule, MatButtonModule, MatIconModule],
    templateUrl: './player-create-button.component.html',
    styleUrl: './player-create-button.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerCreateButtonComponent {
  @Optional()
  private playersStore = inject(PlayersStore);
  private dialog = inject(MatDialog);

  openDialog() {
    this.dialog
      .open(CreatePlayerDialogComponent, {
        width: '600px',
      })
      .afterClosed()
      .subscribe((player: IPlayerDTO | undefined) => {
        if (player) {
          this.playersStore.add(player);
        }
      });
  }
}
