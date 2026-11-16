import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TGameFinalWithoutStatistics } from '@entities/game';

@Component({
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatIconModule,
  ],
  template: `
    @if (loadingSignal()) {
      <mat-progress-bar mode="indeterminate" />
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
    // The request goes through GamesStore.deleteGame
    this.dialogRef.close(true);
  }
}
