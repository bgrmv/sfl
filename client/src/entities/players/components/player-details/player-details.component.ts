import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar'; // For feedback message
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { NilToDashPipe } from '@shared/pipes/nil-to-dash.pipe';
import { catchError, delay, EMPTY, retry, switchMap } from 'rxjs';
import { TPlayerFinal } from '../../../games/types';
import { PlayersService } from '../../services/players.service';

@Component({
    selector: 'sfl-player-details',
    imports: [
        CommonModule,
        MatProgressBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        NilToDashPipe,
    ],
    templateUrl: './player-details.component.html',
    styleUrl: './player-details.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [PlayersService]
})
export class PlayerDetailsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly playersService = inject(PlayersService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly clipboard = inject(Clipboard);
  private readonly snackBarRef = inject(MatSnackBar);

  protected loading = signal<boolean>(true);
  protected player = signal<TPlayerFinal | null>(null);

  ngOnInit(): void {
    this.activatedRoute.paramMap
      .pipe(
        delay(3000),
        switchMap((params: ParamMap) => {
          const id = params.get('id'?.trim());

          if (!id) {
            throw new Error('player id not found');
          }

          return this.playersService.findOne(id);
        }),
        retry({
          count: 3,
          delay: 1000,
        }),
        catchError(e => {
          console.error('playerId is not found', e);
          this.router.navigate(['/players']);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((player: TPlayerFinal) => {
        this.player.set(player);
        this.loading.set(false);
      });
  }

  copy(id: string): void {
    this.clipboard.copy(id); // Copy the ID to the clipboard

    // Show feedback using MatSnackBar
    this.snackBarRef.open('ID copied to clipboard!', 'Close', {
      duration: 20_000,
      politeness: 'assertive',
    });
  }
}
