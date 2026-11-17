import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableQuery } from '@shared/lib/table-query';
import { format } from 'date-fns';
import { GameService, GamesStore, seasonRibbon } from '@entities/game';
import { PlayersService, PlayersStore } from '@entities/player';
import { AuthService } from '@shared/auth/auth.service';
import { KIT } from '@shared/ui/kit';

/**
 * Games list of the design. LIVE (games.list): rows come from GamesStore.
 * Still dummy here: the pagination (the API returns the whole season).
 */
@Component({
  selector: 'sfl-games-board-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameService, GamesStore, PlayersService, PlayersStore],
  template: `
    <div class="k-page k-page--narrow k-compact">
      <sfl-page-head
        title="Games"
        lead="All Saturdays, newest first. Only published games count in the ratings."
      >
        @if (isAdmin()) {
          <a
            sflBtn
            routerLink="/games/create"
          >
            Create game
          </a>
        }
      </sfl-page-head>

      <sfl-card
        *sflFeature="'games.list'"
        flag="games.list"
      >
        <div class="k-row">
          <span class="k-label">Season</span>
          <sfl-segmented
            label="Season"
            [options]="seasons"
            [value]="season()"
            (changed)="season.set($event)"
          />
          <span class="k-grow"></span>
          <sfl-segmented
            label="Status"
            [options]="statuses"
            [value]="status()"
            (changed)="status.set($event)"
          />
        </div>
        <sfl-season-ribbon
          *sflFeature="'design.seasonRibbon'"
          [cells]="ribbon()"
          [label]="'Saturdays of season ' + season()"
        />
        <sfl-filter-bar [query]="tq" />
        @if (loading()) {
          <sfl-state kind="loading" />
        } @else if (!rows().length) {
          <sfl-state
            title="No games"
            text="Nothing matches this filter."
          />
        } @else {
          <div class="k-scroll">
            <table class="k-table">
              <caption class="k-visually-hidden">Games of the season</caption>
              <thead>
                <tr>
                  <th
                    sflSortKey="number"
                    [query]="tq"
                  >
                    Game
                  </th>
                  <th
                    sflSortKey="ts"
                    [query]="tq"
                  >
                    Date
                  </th>
                  <th
                    sflSortKey="goals"
                    [query]="tq"
                    class="r"
                  >
                    Score
                  </th>
                  <th
                    sflSortKey="mvp"
                    [query]="tq"
                  >
                    MVP
                  </th>
                  <th
                    sflSortKey="status"
                    [query]="tq"
                  >
                    Status
                  </th>
                  @if (isAdmin()) {
                    <th></th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (g of rows(); track g.number) {
                  <tr>
                    <td>
                      <a
                        class="k-link"
                        [routerLink]="['/games/details', g.season, g.number]"
                      >
                        Game {{ g.number }}
                      </a>
                    </td>
                    <td class="k-muted">{{ g.date }}</td>
                    <td class="r">
                      <b class="k-num">{{ g.a }} : {{ g.b }}</b>
                    </td>
                    <td>{{ g.mvp }}</td>
                    <td>
                      <sfl-badge
                        [tone]="g.status === 'Published' ? 'accent' : 'outline'"
                      >
                        {{ g.status }}
                      </sfl-badge>
                    </td>
                    @if (isAdmin()) {
                      <td>
                        <a
                          sflBtn
                          size="sm"
                          variant="ghost"
                          [routerLink]="['/games/edit', g.season, g.number]"
                        >
                          Edit
                        </a>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </sfl-card>
    </div>
  `,
})
export class GamesBoardPageComponent {
  readonly isAdmin = inject(AuthService).isAdmin;
  private readonly store = inject(GamesStore);
  private readonly players = inject(PlayersStore);
  private readonly thisYear = new Date().getFullYear();
  protected readonly seasons = [
    String(this.thisYear),
    String(this.thisYear - 1),
    String(this.thisYear - 2),
  ];
  protected readonly statuses = ['All', 'Published', 'Draft'];
  protected readonly season = signal(String(this.thisYear));
  protected readonly status = signal('All');
  protected readonly loading = this.store.loading;

  constructor() {
    effect(() => {
      this.store.initGamesStore({ season: Number(this.season()) });
    });
  }

  protected readonly ribbon = computed(() =>
    seasonRibbon(this.store.gamesEntities(), Number(this.season()), new Date()),
  );

  protected readonly tq = new TableQuery(
    [
      { key: 'number', label: 'Game', type: 'number' },
      { key: 'goals', label: 'Total goals', type: 'number' },
      { key: 'a', label: 'Goals of 1st draft', type: 'number' },
      { key: 'b', label: 'Goals of 2nd draft', type: 'number' },
      { key: 'mvp', label: 'MVP', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
    ],
    { key: 'number', dir: 'desc' },
  );

  protected readonly rows = computed(() => {
    const names = new Map(
      this.players.playersEntities().map(p => [p.id, p.nickname]),
    );
    const list = this.store
      .gamesEntities()
      .filter(g => g.status !== 'furture')
      .map(g => ({
        number: g.number,
        season: g.season,
        date: format(g.playedAt, 'd MMM yyyy'),
        a: g.metadata?.scoreFirstDraft ?? 0,
        b: g.metadata?.scoreSecondDraft ?? 0,
        ts: g.playedAt.getTime(),
        goals:
          (g.metadata?.scoreFirstDraft ?? 0) +
          (g.metadata?.scoreSecondDraft ?? 0),
        mvp: mvpNames(g.metadata?.mvpListIds, names) || '–',
        status: g.status === 'published' ? 'Published' : 'Draft',
      }))
      .filter(g => this.status() === 'All' || g.status === this.status());
    return this.tq.apply(list);
  });
}

function mvpNames(ids: unknown, names: Map<string, string>): string {
  return ((ids ?? []) as string[])
    .map(id => names.get(id))
    .filter(Boolean)
    .join(', ');
}
