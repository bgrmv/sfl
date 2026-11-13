import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TCaptain } from '../../types';

@Component({
    selector: 'sfl-captain-stats-card',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [CommonModule, MatCardModule],
    styles: [
        `
      :host.active {
        & .captain-card__stats {
          background: aquamarine;
        }
      }

      :host.odd {
        box-shadow: 2px 0 2px 2px #ccc;
        width: 100%;
      }

      .captain-card {
        width: 100%;
        min-width: 500px;
        & img {
          max-width: 100%;
        }

        &.captain-card__stats {
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
    <mat-card class="captain-card captain-card__stats">
      <mat-card-header>
        <mat-card-title-group>
          <mat-card-title>
            {{ captain.nickname }}
            <span *ngIf="captain?.team">({{ captain.team }})</span>
          </mat-card-title>
          <mat-card-subtitle>{{ captain.nickname }}</mat-card-subtitle>
          <img
            mat-card-avatar
            src="https://picsum.photos/id/{{ captain.avatar }}/200/300"
            alt="Photo of a Shiba Inu"
          />
        </mat-card-title-group>
      </mat-card-header>
      <mat-card-content>
        <p>Draws: {{ captain.draws }}</p>
        <p>Won Games:{{ captain.wonGames }}</p>
        <p>Lost Games: {{ captain.lostGames }}</p>
        <p>Max Win Streak: {{ captain.maxWinStreak }}</p>
        <p>Max Lost Strek: {{ captain.maxLostStreak }}</p>
      </mat-card-content>
    </mat-card>
  `
})
export class CaptainStatsCardComponent {
  @Input({ required: true }) captain!: TCaptain;
}
