import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { addMonths, format } from 'date-fns';
import { GameService, GamesStore } from '@entities/game';
import { monthCells, nextSaturday } from '@shared/lib/saturdays';
import { KIT } from '@shared/ui/kit';

/**
 * Calendar. LIVE (calendar.page): the Saturdays of the month are computed (the league plays
 * every Saturday) and the played games come from GamesStore. DUMMY: birthdays, votes and
 * "on this day" entries of the list (`calendar.events`).
 */
@Component({
  selector: 'sfl-calendar-page',
  imports: [...KIT],
  providers: [GameService, GamesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page k-page--wide k-page--tight"
      *sflFeature="'calendar.page'"
    >
      <sfl-page-head
        title="Calendar"
        lead="Saturdays, birthdays, memories and dates of votes in one place."
      >
        <button
          sflBtn
          variant="ghost"
          type="button"
        >
          Subscribe (iCal)
        </button>
        <button
          sflBtn
          type="button"
        >
          Add next game to my calendar
        </button>
      </sfl-page-head>
      <div class="k-grid-2">
        <sfl-card
          flag="calendar.page"
          [title]="label()"
        >
          <div class="k-row k-between">
            <button
              sflBtn
              variant="ghost"
              size="sm"
              type="button"
              aria-label="Previous month"
              (click)="shift(-1)"
            >
              ‹
            </button>
            <b class="k-head">{{ label() }}</b>
            <button
              sflBtn
              variant="ghost"
              size="sm"
              type="button"
              aria-label="Next month"
              (click)="shift(1)"
            >
              ›
            </button>
          </div>
          <sfl-month
            [cells]="cells()"
            [label]="label() + ': played, next and planned Saturdays'"
          />
          <div class="k-row k-small k-muted">
            <span>Played</span>
            <span>Next game</span>
            <span>Planned</span>
          </div>
        </sfl-card>
        <sfl-card
          *sflFeature="'calendar.events'"
          flag="calendar.events"
          title="Next 30 days"
        >
          <!-- DUMMY (calendar.events): birthdays (S10.44) and ends of votes (S10.35) are made up -->
          <ul class="k-list">
            <li>
              <div style="width: 44px; text-align: center">
                <b
                  class="k-head"
                  style="font-size: 22px"
                >
                  {{ nextDay }}
                </b>
                <div class="k-eyebrow">{{ nextMon }}</div>
              </div>
              <div class="k-grow">
                <b>Next game</b>
                <div class="k-muted k-small">
                  Every Saturday, in any weather
                </div>
              </div>
            </li>
            @for (u of upcoming; track u.t) {
              <li>
                <div style="width: 44px; text-align: center">
                  <b
                    class="k-head"
                    style="font-size: 22px"
                  >
                    {{ u.day }}
                  </b>
                  <div class="k-eyebrow">{{ u.mon }}</div>
                </div>
                <div class="k-grow">
                  <b>{{ u.t }}</b>
                  <div class="k-muted k-small">{{ u.s }}</div>
                </div>
              </li>
            }
          </ul>
        </sfl-card>
      </div>
      <sfl-card
        flag="calendar.page"
        title="What is here"
      >
        <ul class="k-small k-muted">
          <li>Saturdays: played with the score, next, planned.</li>
          <li>Birthdays of players who agreed to show them (sample).</li>
          <li>Dates when a vote ends (sample).</li>
        </ul>
      </sfl-card>
    </div>
  `,
})
export class CalendarPageComponent {
  private readonly games = inject(GamesStore);
  private readonly today = new Date();
  protected readonly cursor = signal(
    new Date(this.today.getFullYear(), this.today.getMonth(), 1),
  );
  protected readonly label = computed(() => format(this.cursor(), 'MMMM yyyy'));
  protected readonly nextDay = format(nextSaturday(this.today), 'd');
  protected readonly nextMon = format(nextSaturday(this.today), 'MMM');

  constructor() {
    effect(() =>
      this.games.initGamesStore({ season: this.cursor().getFullYear() }),
    );
  }

  protected readonly cells = computed(() =>
    monthCells(
      this.cursor().getFullYear(),
      this.cursor().getMonth(),
      this.games
        .gamesEntities()
        .filter(g => g.status === 'published')
        .map(g => g.playedAt),
      this.today,
    ),
  );

  shift(by: number) {
    this.cursor.update(d => addMonths(d, by));
  }

  // DUMMY (calendar.events)
  protected readonly upcoming = [
    { day: 19, mon: 'Nov', t: 'Lynx turns 32', s: 'Birthday' },
    {
      day: 24,
      mon: 'Nov',
      t: 'Vote ends',
      s: 'Clean sheet bonus for the goalkeeper',
    },
  ];
}
