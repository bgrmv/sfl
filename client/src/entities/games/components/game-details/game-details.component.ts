import { Clipboard } from '@angular/cdk/clipboard';
import {
  NgClass,
  NgTemplateOutlet,
  JsonPipe,
  DatePipe,
  LowerCasePipe,
  UpperCasePipe,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IGameDTO, IPlayerDTO } from '@entities/games/types';
import { PlayersService } from '@entities/players/services/players.service';
import { NilToDashPipe } from '@shared/pipes/nil-to-dash.pipe';
import { omit } from 'lodash-es';
import { filter, map, switchMap } from 'rxjs';

@Component({
  selector: 'sfl-game-details',
  imports: [
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    NilToDashPipe,
    MatTableModule,
    MatTooltipModule,
    DatePipe,
    JsonPipe,
    LowerCasePipe,
    NgClass,
    NgTemplateOutlet,
    UpperCasePipe,
  ],
  templateUrl: './game-details.component.html',
  styleUrl: './game-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailsComponent implements OnInit {
  protected readonly loading = signal<boolean>(false);
  private readonly clipboard = inject(Clipboard);
  private readonly snackBarRef = inject(MatSnackBar);
  private readonly playersService = inject(PlayersService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly game = input.required<IGameDTO>();
  public readonly players = signal<Record<string, IPlayerDTO>>({});

  public readonly displayedColumns = [
    'nickname',
    'passes',
    'goalsByLeg',
    'goalsByHead',
    'goalsByPenalty',
    'isCaptain',
    'mvp',
    // 'isTransfer',
  ];

  public readonly dataSourceFirstDraft = computed(() => {
    const teamId = this.game().teams[0].id;

    return this.game()
      .statistics.filter(stat => stat.teamId === teamId)
      .map(stat => {
        const player = this.players()[stat.playerId];

        return {
          ...stat,
          ...omit(player, 'isCaptain'),
        };
      });
  });

  public readonly dataSourceSecondDraft = computed(() => {
    const teamId = this.game().teams[1].id;

    return this.game()
      .statistics.filter(stat => stat.teamId === teamId)
      .map(stat => {
        const player = this.players()[stat.playerId];

        return {
          ...stat,
          ...omit(player, 'isCaptain'),
        };
      });
  });

  public readonly playerRef = effect(() => {
    const ids = Object.keys(this.game().metadata?.players);

    if (ids && ids.length) {
      this.playersService.find(ids.join(',')).subscribe();
    }
  });

  public players$ = toObservable(this.game).pipe(
    filter(Boolean),
    map(game => game.statistics.map(stat => stat.playerId)),
    switchMap(playerIds => this.playersService.find(playerIds.join(','))),
    takeUntilDestroyed(this.destroyRef),
  );

  ngOnInit() {
    this.players$.subscribe((players: IPlayerDTO[]) => {
      this.players.set(
        Object.fromEntries(players.map(elem => [elem.id, elem])),
      );
    });
  }

  copy(target: string, message = 'Copied to clipboard'): void {
    this.clipboard.copy(target); // Copy the ID to the clipboard

    // Show feedback using MatSnackBar
    this.snackBarRef.open(message, 'Close', {
      duration: 20_000,
      politeness: 'assertive',
    });
  }
}
