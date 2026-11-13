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
import { GameService } from '@entities/games/services/game.service';
import { IGameDTO, TGameFinalWithoutStatistics } from '@entities/games/types';
import { NilToDashPipe } from '@shared/pipes/nil-to-dash.pipe';
import { catchError, delay, of, switchMap, tap } from 'rxjs';

@Component({
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
  providers: [GameService],
  template: `
    @if (loadingSignal()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <h2 mat-dialog-title>Delete game</h2>
    <mat-dialog-content class="mat-typography">
      <h3>
        {{ data.subtitle ?? 'Are you sure you want to delete this game?' }}
      </h3>
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
        Delete
      </button>
    </mat-dialog-actions>
  `,
  styles: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDeleteDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly gameService = inject(GameService);
  private readonly dialogRef: MatDialogRef<GameDeleteDialogComponent> =
    inject(MatDialogRef);

  protected readonly data: {
    title?: string;
    subtitle?: string;
    game: WithId<Partial<TGameFinalWithoutStatistics>>;
  } = inject(MAT_DIALOG_DATA);

  protected readonly loadingSignal = signal(false);

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    of(this.data.game.id)
      .pipe(
        tap(() => {
          this.loadingSignal.update(() => true);
        }),
        delay(1_000),
        switchMap(id => {
          return this.gameService.delete(id);
        }),
        catchError(error => {
          console.error(error);
          return of();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((game: IGameDTO | null) => {
        this.dialogRef.close(!!game);
      });
  }
}
