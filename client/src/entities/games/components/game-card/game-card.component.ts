import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { DatePipe, LowerCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { GamesStore } from '@entities/games/store/games.store';
import { IGameDTO } from '@entities/games/types';
import { getTotalWeeksBySeason } from '@entities/utils/date';
import { AuthService } from '@shared/services/auth.service';
import { differenceInCalendarDays, isBefore } from 'date-fns';
import { EnumGameStatus } from '../../constants';
import { GameDeleteDialogComponent } from '../game-delete-dialog/game-delete-dialog.component';

@Component({
  selector: 'sfl-game-card',
  imports: [
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    DatePipe,
    LowerCasePipe,
  ],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCardComponent {
  private readonly router = inject(Router);
  private activatedRouter = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  protected readonly authService = inject(AuthService);
  private readonly gamesStore = inject(GamesStore);

  public gameCard = input.required<IGameDTO>();
  public readonly enumGameStatus = EnumGameStatus;

  protected readonly totalWeeks = computed(() => {
    const { season } = this.gameCard();
    return getTotalWeeksBySeason(Number(season));
  });

  public readonly hasGamePlayed = computed(() => {
    return this.gameCard
      ? isBefore(this.gameCard().playedAt, new Date())
      : false;
  });

  protected readonly daysLeft = computed(() => {
    const gameDate = new Date(this.gameCard().playedAt);

    // Calculate the difference in days
    return differenceInCalendarDays(gameDate, new Date());
  });

  protected readonly wonTeamClass = computed(() => {
    if (this.gameCard().metadata?.isTeamFromFirstDraftWon === true) {
      return this.gameCard().teams.at(0)?.name;
    }
    if (this.gameCard().metadata?.isTeamFromSecondDraftWon === true) {
      return this.gameCard().teams.at(1)?.name;
    }

    return '';
  });

  protected readonly teamNamesByDraft = computed(() => {
    return {
      firstDraft: this.gameCard().teams[0].name,
      secondDraft: this.gameCard().teams[1].name,
    };
  });

  openDetails() {
    const { season, number } = this.gameCard();
    this.router.navigate(['games', 'details', season, number]);
  }

  createGame() {
    const { number, season, status, playedAt } = this.gameCard();

    this.router.navigate(['games', 'create'], {
      queryParams: { number, season, status, playedAt: playedAt.toISOString() },
    });
  }

  edit() {
    const { season, number } = this.gameCard();
    this.router.navigate(['games', 'edit', season, number]);
  }

  delete() {
    this.dialog
      .open(GameDeleteDialogComponent, {
        data: { game: this.gameCard() },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        confirmed && this.gamesStore.deleteGame(this.gameCard());
      });
  }
}
