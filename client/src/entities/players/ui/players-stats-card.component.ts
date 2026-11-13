import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TChosenPlayer } from '../types';

@Component({
    selector: 'sfl-player-stats-card',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [CommonModule, MatCardModule],
    styles: [
        `
      :host.active {
        & .player-card__stats {
          background: aquamarine;
        }
      }

      :host.odd {
        box-shadow: 2px 0 2px 2px #ccc;
        width: 100%;
      }

      .player-card {
        width: 100%;
        & img {
          max-width: 100%;
        }

        &.player-card__stats {
          &:hover {
            cursor: pointer;
            background: aquamarine;
            color: white;
            z-index: 1;
          }
        }
      }
    `,
    ],
    template: `
    <mat-card class="player-card player-card__stats">
      <mat-card-header>
        <mat-card-title-group>
          <mat-card-title>
            {{ player.nickname }}
            <span *ngIf="player?.team">({{ player.team }})</span>
          </mat-card-title>
          <mat-card-subtitle>
            {{ player.nickname }}
          </mat-card-subtitle>
          <img
            mat-card-avatar
            src="https://picsum.photos/id/{{ player.avatar }}/200/300"
            alt="Photo of a Shiba Inu"
          />
        </mat-card-title-group>
      </mat-card-header>
      <mat-card-content>
        <p>Draws: {{ player.draws }}</p>
        <p>Won Games:{{ player.wonGames }}</p>
        <p>Lost Games: {{ player.lostGames }}</p>
        <p>Max Win Streak: {{ player.maxWinStreak }}</p>
        <p>Max Lost Strek: {{ player.maxLostStreak }}</p>

        <!-- Ng-content -->
        <ng-content></ng-content>
      </mat-card-content>
    </mat-card>
  `
})
export class PlayerStatsCardComponent {
  @Input({ required: true }) player!: TChosenPlayer;
}
