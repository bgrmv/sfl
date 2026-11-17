import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PlayersService,
  PlayersStatsStore,
  allSeasons,
  rankingRows,
  PlayerChipComponent,
} from '@entities/player';
import { seasonLabel } from '@shared/lib/season-label';
import { TableQuery } from '@shared/lib/table-query';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

/**
 * Seasons. LIVE (seasons.page): season numbers, top three, awards and the seasons compared come
 * from PlayersStatsStore. DUMMY: BMW against HONDA and the hall of fame (`seasons.fame`).
 */
@Component({
  selector: 'sfl-seasons-page',
  imports: [PlayerChipComponent, RouterLink, ...KIT],
  providers: [PlayersService, PlayersStatsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="k-page">
      <sfl-page-head
        title="Seasons"
        lead="Results, awards and the hall of fame. Only published games count."
      />
      @if (loading()) {
        <sfl-state kind="loading" />
      } @else if (!years().length) {
        <sfl-state
          title="No seasons yet"
          text="Seasons appear after the first published game."
        />
      } @else {
        <sfl-segmented
          label="Season"
          [options]="labels()"
          [value]="current()"
          (changed)="picked.set(keyOf($event))"
        />
        <ng-container *sflFeature="'seasons.page'">
          <sfl-card
            flag="seasons.page"
            tone="score"
            [title]="'Season ' + key()"
          >
            <p>{{ summary().games }} Saturdays played</p>
            <div class="k-grid-sm">
              <sfl-stat
                label="Goals"
                [value]="summary().goals"
              />
              <sfl-stat
                label="Per game"
                [value]="summary().perGame"
              />
              <sfl-stat
                label="Players"
                [value]="summary().players"
              />
            </div>
          </sfl-card>

          <div class="k-grid">
            <sfl-card
              flag="seasons.page"
              title="Top three"
            >
              <ul class="k-list">
                @for (p of top(); track p.id) {
                  <li>
                    <b
                      class="k-head"
                      style="font-size: 22px; width: 28px"
                    >
                      {{ p.rank }}
                    </b>
                    <sfl-player-chip
                      class="k-grow"
                      [playerId]="p.id"
                      [name]="p.name"
                      [size]="40"
                    />
                    <span class="k-muted k-small">
                      {{ p.pts }} points · {{ p.days }} days
                    </span>
                  </li>
                }
              </ul>
            </sfl-card>
            <sfl-card
              flag="seasons.page"
              title="Awards of the season"
            >
              <ul class="k-list">
                @for (a of awards(); track a.t) {
                  <li>
                    <sfl-badge tone="accent">{{ a.t }}</sfl-badge>
                    <a
                      class="k-grow"
                      [routerLink]="['/players', a.id]"
                    >
                      {{ a.name }}
                    </a>
                    <span class="k-muted k-small">{{ a.v }}</span>
                  </li>
                }
              </ul>
            </sfl-card>
            <sfl-card
              flag="seasons.page"
              title="Seasons compared"
            >
              <table class="k-table">
                <thead>
                  <tr>
                    <th
                      sflSortKey="year"
                      [query]="tq"
                    >
                      Season
                    </th>
                    <th
                      sflSortKey="g"
                      [query]="tq"
                      class="r"
                    >
                      Games
                    </th>
                    <th
                      sflSortKey="gg"
                      [query]="tq"
                      class="r"
                    >
                      Goals/game
                    </th>
                    <th
                      sflSortKey="w"
                      [query]="tq"
                    >
                      Top player
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of sortedCompared(); track r.y) {
                    <tr>
                      <td>{{ r.y }}</td>
                      <td class="r">{{ r.g }}</td>
                      <td class="r">{{ r.gg }}</td>
                      <td>{{ r.w }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </sfl-card>
          </div>
        </ng-container>
      }

      <sfl-card
        *sflFeature="'seasons.fame'"
        flag="seasons.fame"
        title="BMW against HONDA and the hall of fame"
      >
        <!-- DUMMY (seasons.fame): wins by colour and the records since 1980 are made up -->
        <sfl-split-bar
          [a]="5"
          [b]="5"
        />
        <p class="k-small k-muted">
          The colour is only a bib: the captains decide who wears which.
        </p>
        <div class="k-grid-sm">
          @for (n of fame; track n.l) {
            <sfl-stat
              [label]="n.l"
              [value]="n.v"
              [sub]="n.s"
            />
          }
        </div>
        <p class="k-hint">
          Records over all seasons since 1980: facts of the early years are
          added by the owner; the numbers here are made up.
        </p>
      </sfl-card>
    </div>
  `,
})
export class SeasonsPageComponent {
  private readonly store = inject(PlayersStatsStore);
  protected readonly loading = this.store.loading;
  protected readonly system = inject(RatingSystemStore).system;
  protected readonly picked = signal<string | null>(null);
  protected readonly keyOf = (label: string) => `20${label.slice(1)}`;

  protected readonly years = computed(() =>
    allSeasons(this.store.playersEntities()),
  );
  protected readonly labels = computed(() => this.years().map(seasonLabel));
  protected readonly key = computed(() => this.picked() ?? this.years()[0]);
  protected readonly current = computed(() => seasonLabel(this.key()));

  private readonly ranking = computed(() =>
    rankingRows(this.store.playersEntities(), this.key(), this.system()),
  );
  protected readonly top = computed(() => this.ranking().slice(0, 3));
  protected readonly summary = computed(() => {
    const rows = this.ranking();
    const games = Math.max(0, ...rows.map(r => r.days));
    const goals = rows.reduce((a, r) => a + r.goals, 0);
    return {
      games,
      goals,
      perGame: games ? (goals / games).toFixed(1) : '0',
      players: rows.length,
    };
  });
  protected readonly awards = computed(() => {
    const rows = this.ranking();
    const best = (
      pick: (r: (typeof rows)[number]) => number,
      t: string,
      unit: string,
    ) => {
      const r = rows.slice().sort((a, b) => pick(b) - pick(a))[0];
      return r && pick(r) > 0
        ? [{ t, id: r.id, name: r.name, v: `${pick(r)} ${unit}` }]
        : [];
    };
    return [
      ...best(r => r.goals, 'Top scorer', 'goals'),
      ...best(r => r.passes, 'Top passer', 'passes'),
      ...best(r => r.mvp, 'Most MVP', 'MVP'),
      ...best(r => r.days, 'Ever present', 'days'),
    ];
  });
  protected readonly compared = computed(() =>
    this.years().map(y => {
      const rows = rankingRows(this.store.playersEntities(), y, this.system());
      const games = Math.max(0, ...rows.map(r => r.days));
      const goals = rows.reduce((a, r) => a + r.goals, 0);
      return {
        year: Number(y),
        y: seasonLabel(y),
        g: games,
        gg: games ? Number((goals / games).toFixed(1)) : 0,
        w: rows[0]?.name ?? '–',
      };
    }),
  );

  protected readonly tq = new TableQuery([]);
  protected readonly sortedCompared = computed(() =>
    this.tq.apply(this.compared()),
  );

  protected readonly fame = [
    { l: 'Most points in a season', v: '58', s: 'Falcon, 2025' },
    { l: 'Longest win streak', v: '11', s: 'Otter, 2024' },
    { l: 'Goals in a game', v: '7', s: 'Wolf, 2019' },
    { l: 'Games in a row', v: '212', s: 'Lynx' },
  ];
}
