import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PlayersService,
  PlayersStatsStore,
  allSeasons,
  rankingRows,
  signed,
  PlayerChipComponent,
  RatingCardComponent,
} from '@entities/player';
import { seasonKeyOf, seasonLabel } from '@shared/lib/season-label';
import { TableQuery } from '@shared/lib/table-query';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

/**
 * Ranking of players. LIVE (players.ranking): PlayersStatsStore (players with metadata).
 * Still dummy here: the arrow of the place (change since the previous game) needs the ranking history.
 */
@Component({
  selector: 'sfl-players-board-page',
  imports: [PlayerChipComponent, RatingCardComponent, FormsModule, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PlayersService, PlayersStatsStore],
  template: `
    <div class="k-page k-page--tight">
      <sfl-page-head
        title="Players"
        [lead]="
          total() +
          ' players · ' +
          games() +
          ' games in ' +
          season() +
          ' · only published games count'
        "
      >
        <a
          sflBtn
          variant="ghost"
          routerLink="/compare"
        >
          ⇄ Compare
        </a>
      </sfl-page-head>

      <sfl-card
        *sflFeature="'players.ranking'"
        flag="players.ranking"
      >
        <div class="k-row">
          <sfl-segmented
            label="Season"
            [options]="seasons()"
            [value]="season()"
            (changed)="pick($event)"
          />
          <span class="k-grow"></span>
          <sfl-segmented
            label="View"
            [options]="views"
            [value]="view()"
            (changed)="view.set($event)"
          />
        </div>
        <div class="k-row">
          <span class="k-small">
            Scoring:
            <b>{{ system() }}</b>
            · set in the header ·
            <a
              class="k-link"
              routerLink="/compare/systems"
            >
              compare the systems
            </a>
          </span>
        </div>
        <div class="k-row">
          <label class="k-check">
            <input
              type="checkbox"
              [(ngModel)]="activeOnly"
            />
            Active only
          </label>
          <div class="k-field k-grow">
            <label
              class="k-visually-hidden"
              for="q"
            >
              Search
            </label>
            <input
              id="q"
              class="k-input"
              placeholder="Search by name or number"
              [ngModel]="q()"
              (ngModelChange)="q.set($event)"
            />
          </div>
        </div>

        @if (view() === 'Cards') {
          <sfl-sort-select [query]="tq" />
        }
        <sfl-filter-bar [query]="tq" />

        @if (loading()) {
          <sfl-state kind="loading" />
        } @else if (!rows().length) {
          <sfl-state
            title="No players"
            text="Nobody has published games in this season or matches the search."
          />
        } @else if (view() === 'Table') {
          <div class="k-scroll">
            <table class="k-table">
              <caption class="k-visually-hidden">
                Player ranking, {{ system() }} rating system, season 2026
              </caption>
              <thead>
                <tr>
                  <th
                    sflSortKey="rank"
                    [query]="tq"
                  >
                    #
                  </th>
                  <th
                    sflSortKey="name"
                    [query]="tq"
                  >
                    Player
                  </th>
                  <th
                    sflSortKey="form"
                    [query]="tq"
                  >
                    Form
                  </th>
                  <th
                    sflSortKey="days"
                    [query]="tq"
                    class="r"
                  >
                    Days
                  </th>
                  <th
                    sflSortKey="goals"
                    [query]="tq"
                    class="r"
                  >
                    Goals
                  </th>
                  <th
                    sflSortKey="passes"
                    [query]="tq"
                    class="r"
                  >
                    Passes
                  </th>
                  <th
                    sflSortKey="og"
                    [query]="tq"
                    class="r"
                  >
                    OG
                  </th>
                  <th
                    sflSortKey="pm"
                    [query]="tq"
                    class="r"
                  >
                    +/−
                  </th>
                  <th
                    sflSortKey="lr"
                    [query]="tq"
                    class="r"
                  >
                    LR
                  </th>
                  <th
                    sflSortKey="mvp"
                    [query]="tq"
                    class="r"
                  >
                    MVP
                  </th>
                  <th
                    sflSortKey="pts"
                    [query]="tq"
                    class="r"
                  >
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (r of rows(); track r.id) {
                  <tr>
                    <td>
                      {{ r.rank }}
                    </td>
                    <td>
                      <sfl-player-chip
                        [playerId]="r.id"
                        [name]="r.name"
                        [number]="r.no"
                        [bold]="true"
                      />
                    </td>
                    <td><sfl-form-dots [form]="r.form" /></td>
                    <td class="r">{{ r.days }}</td>
                    <td class="r">{{ r.goals }}</td>
                    <td class="r">{{ r.passes }}</td>
                    <td class="r">{{ r.og }}</td>
                    <td class="r">{{ signed(r.pm) }}</td>
                    <td class="r">{{ signed(r.lr) }}</td>
                    <td class="r">{{ r.mvp }}</td>
                    <td class="r">
                      <b>{{ r.pts }}</b>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="k-grid">
            @for (r of rows(); track r.id) {
              <sfl-rating-card
                [rank]="r.rank"
                [playerId]="r.id"
                [name]="r.name"
                [value]="r.pts"
              >
                <div class="k-muted k-small">
                  {{ r.no ? '№ ' + r.no + ' · ' : '' }}{{ r.days }} days · MVP
                  {{ r.mvp }}
                </div>
                <sfl-form-dots [form]="r.form" />
                <div class="k-small">
                  Goals {{ r.goals }} · Pass {{ r.passes }} · +/−
                  {{ signed(r.pm) }} · LR {{ signed(r.lr) }}
                </div>
              </sfl-rating-card>
            }
          </div>
        }
        <p class="k-hint">
          Arrow next to the place: change since the previous game. OG is own
          goals. LR is the balance of results: +1 for a win, −1 for a loss.
          Form: last five games, W win, D draw, L loss.
        </p>
        <div class="k-row k-between">
          <span class="k-muted k-small">
            Showing {{ rows().length }} of {{ total() }}
          </span>
        </div>
      </sfl-card>
    </div>
  `,
})
export class PlayersBoardPageComponent {
  private readonly store = inject(PlayersStatsStore);
  protected readonly loading = this.store.loading;
  protected readonly views = ['Cards', 'Table'];
  protected readonly system = inject(RatingSystemStore).system;
  protected readonly view = signal('Table');
  protected readonly q = signal('');
  protected activeOnly = true;
  protected readonly signed = signed;

  private readonly keys = computed(() => [
    ...allSeasons(this.store.playersEntities()),
    'all',
  ]);
  protected readonly seasons = computed(() => this.keys().map(seasonLabel));
  private readonly picked = signal<string | null>(null);
  protected readonly season = computed(() =>
    seasonLabel(this.picked() ?? this.keys()[0]),
  );
  protected pick(label: string) {
    this.picked.set(seasonKeyOf(label));
  }

  private readonly ranking = computed(() =>
    rankingRows(
      this.store.playersEntities(),
      seasonKeyOf(this.season()),
      this.system(),
    ),
  );
  protected readonly total = computed(
    () => this.store.playersEntities().length,
  );
  protected readonly tq = new TableQuery([
    { key: 'name', label: 'Player', type: 'text' },
    { key: 'no', label: 'Number', type: 'number' },
    { key: 'form', label: 'Form', type: 'text' },
    { key: 'days', label: 'Days', type: 'number' },
    { key: 'goals', label: 'Goals', type: 'number' },
    { key: 'passes', label: 'Passes', type: 'number' },
    { key: 'og', label: 'Own goals', type: 'number' },
    { key: 'pm', label: '+/−', type: 'number' },
    { key: 'lr', label: 'LR', type: 'number' },
    { key: 'mvp', label: 'MVP', type: 'number' },
    { key: 'pts', label: 'Points', type: 'number' },
    { key: 'rank', label: 'Place', type: 'number' },
  ]);
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.tq.apply(
      this.ranking().filter(
        p => !q || p.name.toLowerCase().includes(q) || String(p.no) === q,
      ),
    );
  });
  protected readonly games = computed(() =>
    Math.max(0, ...this.ranking().map(r => r.days)),
  );
}
