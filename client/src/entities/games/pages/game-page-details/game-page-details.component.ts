import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { GameDetailsComponent } from '@entities/games/components/game-details/game-details.component';
import { GameService } from '@entities/games/services/game.service';
import { PlayersService } from '@entities/players/services/players.service';
import { head } from 'lodash-es';
import { catchError, map, switchMap } from 'rxjs';
import { IGameDTO } from '../../types';

@Component({
    selector: 'sfl-game-page-details',
    imports: [GameDetailsComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [GameService, PlayersService],
    styles: ``,
    template: `
    @if (game(); as game) {
      <sfl-game-details [game]="game!" />
    }
  `
})
export class GamePageDetailsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly game = signal<IGameDTO | null>(null);

  ngOnInit() {
    this.activatedRoute.paramMap
      .pipe(
        map(paramMap => ({
          season: paramMap.get('season'),
          number: paramMap.get('number'),
        })),
        switchMap(({ number, season }) => {
          if (!number || !season) {
            throw new Error('Missing number or season');
          }
          return this.gameService
            .find({ number: Number(number), season: Number(season) })
            .pipe(map(head<IGameDTO>));
        }),
        catchError(err => {
          this.router.navigate(['games']);
          throw new Error(err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(game => {
        if (!game) {
          this.router.navigate(['games']);
          return;
        }

        this.game.set(game);
      });
  }
}
