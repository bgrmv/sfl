import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IPlayerDTO, TPlayerFinal } from '@entities/games/types';
import { PlayersService } from '@entities/players/services/players.service';
import { NilToDashPipe } from '@shared/pipes/nil-to-dash.pipe';
import { catchError, delay, of, switchMap, tap } from 'rxjs';

@Component({
  selector: 'sfl-player-edit-dialog',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatIconModule,
    NilToDashPipe,
  ],
  providers: [PlayersService],
  template: `
    @if (loadingSignal()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <mat-dialog-content>
      <h1 mat-dialog-title>Delete player</h1>
      <h2 [style.marginLeft.px]="26">
        {{ data.subtitle ?? 'Are you sure you want to delete this player?' }}
      </h2>

      <form>
        <mat-form-field>
          <mat-label>id</mat-label>
          <input
            matInput
            type="text"
            [disabled]="true"
            [value]="data.player.id"
          />
          <button
            matSuffix
            mat-icon-button
            aria-label="Copy"
            [disabled]="true"
          >
            <mat-icon fontIcon="content_copy"></mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Nickname</mat-label>
          <input
            matInput
            type="text"
            [disabled]="true"
            [value]="data.player.nickname | nilToDash"
          />
        </mat-form-field>

        <mat-form-field>
          <mat-label>Number</mat-label>
          <input
            matInput
            type="number"
            [disabled]="true"
            [value]="data.player.number | nilToDash"
          />
        </mat-form-field>

        <div class="user-fieldset">
          <mat-form-field>
            <mat-label>Email</mat-label>
            <input
              matInput
              type="text"
              [disabled]="true"
              [value]="data.player.user?.email | nilToDash"
            />
          </mat-form-field>

          <mat-form-field>
            <mat-label>Name</mat-label>
            <input
              matInput
              type="text"
              [disabled]="true"
              [value]="data.player.user?.name | nilToDash"
            />
          </mat-form-field>

          <mat-form-field>
            <mat-label>Surname</mat-label>
            <input
              matInput
              type="text"
              [disabled]="true"
              [value]="data.player.user?.surname | nilToDash"
            />
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-button
        (click)="onNoClick()"
      >
        Close
      </button>

      <button
        color="warn"
        mat-flat-button
        cdkFocusInitial
        (click)="onConfirm()"
        [disabled]="loadingSignal()"
      >
        <!-- TODO @if (loadingSignal()) {
          <mat-progress-spinner></mat-progress-spinner>
        } @else {
        } -->
        Delete
      </button>
    </mat-dialog-actions>
  `,
  styleUrl: './player-delete-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerDeleteDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly playersService = inject(PlayersService);
  private readonly dialogRef: MatDialogRef<PlayerDeleteDialogComponent> =
    inject(MatDialogRef);

  protected readonly data: {
    title?: string;
    subtitle?: string;
    player: WithId<Partial<TPlayerFinal>>;
  } = inject(MAT_DIALOG_DATA);

  protected readonly loadingSignal = signal(false);

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    of(this.data.player)
      .pipe(
        tap(() => {
          this.loadingSignal.update(() => true);
        }),
        delay(2_000),
        switchMap(player => {
          return this.playersService.delete(player.id);
        }),
        catchError(error => {
          console.error(error);
          return of();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((player: IPlayerDTO | null) => {
        this.dialogRef.close(!!player);
      });
  }
}
