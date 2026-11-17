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
  captainRecord,
  formLetters,
  initials,
  ratingOf,
  seasonMetadata,
  signed,
  RatingCardComponent,
} from '@entities/player';
import { seasonKeyOf, seasonLabel } from '@shared/lib/season-label';
import { TableQuery } from '@shared/lib/table-query';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

/**
 * Captains. LIVE (captains.ranking): the captains of the league and their record as captain
 * (PlayersStatsStore). DUMMY: captains of the next Saturday and the head-to-head matrix
 * (`captains.nextDay`, `captains.matrix`), goals for/against and win rate by pick order.
 */
@Component({
  selector: 'sfl-captains-board-page',
  imports: [RatingCardComponent, RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PlayersService, PlayersStatsStore],
  template: `
    <div class="k-page k-page--tight">
      <sfl-page-head
        title="Captains"
        [lead]="
          rows().length +
          ' captains · a captain picks the team in the draft and leads it · only published games count'
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
      <div class="k-row">
        <sfl-segmented
          label="Season"
          [options]="seasons()"
          [value]="season()"
          (changed)="picked.set(seasonKeyOf($event))"
        />
        <sfl-segmented
          label="View"
          [options]="views"
          [value]="view()"
          (changed)="view.set($event)"
        />
      </div>

      <sfl-card
        *sflFeature="'captains.nextDay'"
        flag="captains.nextDay"
        tone="score"
        title="Next Saturday"
      >
        <!-- DUMMY (captains.nextDay): the captains of the day are chosen in the match wizard -->
        <div class="k-row">
          <b class="k-head">Captains of the day</b>
          <sfl-avatar text="FA" />
          Falcon
          <span class="k-muted">VS</span>
          <sfl-avatar text="WO" />
          Wolf
        </div>
        <p class="k-small">
          The first pick is drawn at the start of the draft.
        </p>
      </sfl-card>

      <sfl-card
        *sflFeature="'captains.ranking'"
        flag="captains.ranking"
        [title]="'Captains ranking by win rate, ' + season()"
      >
        @if (view() === 'Cards') {
          <sfl-sort-select [query]="tq" />
        }
        <sfl-filter-bar [query]="tq" />
        @if (loading()) {
          <sfl-state kind="loading" />
        } @else if (!rows().length) {
          <sfl-state
            title="No captains"
            text="Nobody captained a published game in this season."
          />
        } @else if (view() === 'Cards') {
          <div class="k-grid">
            @for (r of rows(); track r.id) {
              <sfl-rating-card
                [playerId]="r.id"
                [name]="r.name"
                [value]="r.rate + '%'"
              >
                <sfl-badge
                  card-badge
                  tone="accent"
                >
                  C
                </sfl-badge>
                <div class="k-small k-muted">
                  {{ r.no ? '№ ' + r.no + ' · ' : '' }}win rate ·
                  {{ r.games }} games as captain
                </div>
                <div class="k-row">
                  <b>{{ r.w }} W</b>
                  <b>{{ r.d }} D</b>
                  <b>{{ r.l }} L</b>
                </div>
                <div class="k-small">
                  1st draft {{ r.first }} · 2nd draft {{ r.second }} · +/−
                  {{ signed(r.pm) }} · Best streak {{ r.streak }}
                </div>
                <sfl-form-dots [form]="r.form" />
              </sfl-rating-card>
            }
          </div>
        } @else {
          <div class="k-scroll">
            <table class="k-table">
              <caption class="k-visually-hidden">Captains ranking</caption>
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
                    Captain
                  </th>
                  <th
                    sflSortKey="games"
                    [query]="tq"
                    class="r"
                  >
                    Games
                  </th>
                  <th
                    sflSortKey="w"
                    [query]="tq"
                    class="r"
                  >
                    W
                  </th>
                  <th
                    sflSortKey="d"
                    [query]="tq"
                    class="r"
                  >
                    D
                  </th>
                  <th
                    sflSortKey="l"
                    [query]="tq"
                    class="r"
                  >
                    L
                  </th>
                  <th
                    sflSortKey="rate"
                    [query]="tq"
                    class="r"
                  >
                    Win rate
                  </th>
                  <th
                    sflSortKey="first"
                    [query]="tq"
                    class="r"
                  >
                    1st draft
                  </th>
                  <th
                    sflSortKey="second"
                    [query]="tq"
                    class="r"
                  >
                    2nd draft
                  </th>
                  <th
                    sflSortKey="pm"
                    [query]="tq"
                    class="r"
                  >
                    +/−
                  </th>
                  <th
                    sflSortKey="streak"
                    [query]="tq"
                    class="r"
                  >
                    Best streak
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (r of rows(); track r.id; let i = $index) {
                  <tr>
                    <td>{{ r.rank }}</td>
                    <td>
                      <a [routerLink]="['/players', r.id]">{{ r.name }}</a>
                    </td>
                    <td class="r">{{ r.games }}</td>
                    <td class="r">{{ r.w }}</td>
                    <td class="r">{{ r.d }}</td>
                    <td class="r">{{ r.l }}</td>
                    <td class="r">
                      <b>{{ r.rate }}%</b>
                    </td>
                    <td class="r">{{ r.first }}</td>
                    <td class="r">{{ r.second }}</td>
                    <td class="r">{{ signed(r.pm) }}</td>
                    <td class="r">{{ r.streak }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <p class="k-hint">
          Win rate = wins divided by the games the captain led. Captains with
          fewer than 5 games are listed after the rest. 1st/2nd draft: games
          played with the first or the second pick.
        </p>
      </sfl-card>

      <sfl-card
        *sflFeature="'captains.matrix'"
        flag="captains.matrix"
        title="Head to head"
      >
        <!-- DUMMY (captains.matrix): needs the captains of both squads of every game -->
        <div class="k-scroll">
          <table class="k-table">
            <caption class="k-visually-hidden">
              Record of each captain against every other captain
            </caption>
            <thead>
              <tr>
                <th></th>
                @for (c of rows(); track c.id) {
                  <th>{{ c.name }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (a of rows(); track a.id; let i = $index) {
                <tr>
                  <th scope="row">{{ a.name }}</th>
                  @for (b of rows(); track b.id; let j = $index) {
                    <td
                      [style.background]="i === j ? 'var(--sfl-surface-2)' : ''"
                    >
                      {{
                        i === j
                          ? '—'
                          : ((i + j) % 3) +
                            '–' +
                            ((i * j) % 2) +
                            '–' +
                            ((i + 2 * j) % 3)
                      }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="k-hint">
          Sample numbers: row captain’s record against the column captain,
          wins–draws–losses.
        </p>
      </sfl-card>
    </div>
  `,
})
export class CaptainsBoardPageComponent {
  private readonly store = inject(PlayersStatsStore);
  protected readonly signed = signed;
  protected readonly seasonKeyOf = seasonKeyOf;
  protected readonly loading = this.store.loading;
  protected readonly system = inject(RatingSystemStore).system;
  protected readonly views = ['Cards', 'Table'];
  protected readonly view = signal('Cards');
  protected readonly picked = signal<string | null>(null);

  private readonly keys = computed(() => [
    ...allSeasons(this.store.captains()),
    'all',
  ]);
  protected readonly seasons = computed(() => this.keys().map(seasonLabel));
  private readonly key = computed(() => this.picked() ?? this.keys()[0]);
  protected readonly season = computed(() => seasonLabel(this.key()));

  protected readonly tq = new TableQuery([
    { key: 'name', label: 'Captain', type: 'text' },
    { key: 'games', label: 'Games', type: 'number' },
    { key: 'w', label: 'Wins', type: 'number' },
    { key: 'd', label: 'Draws', type: 'number' },
    { key: 'l', label: 'Losses', type: 'number' },
    { key: 'rate', label: 'Win rate %', type: 'number' },
    { key: 'first', label: '1st draft games', type: 'number' },
    { key: 'second', label: '2nd draft games', type: 'number' },
    { key: 'pm', label: '+/−', type: 'number' },
    { key: 'streak', label: 'Best streak', type: 'number' },
  ]);

  private readonly all = computed(() =>
    this.store
      .captains()
      .flatMap(p => {
        const m = seasonMetadata(p, this.key());
        const rec = m ? captainRecord(m) : null;
        if (!m || !rec || rec.games === 0) {
          return [];
        }
        return [
          {
            id: p.id,
            name: p.nickname,
            ini: initials(p.nickname),
            no: p.number ?? null,
            ...rec,
            first: m.totalPlayedAsFirstDraft,
            second: m.totalPlayedAsSecondDraft,
            pm: ratingOf(m, this.system()).plusMinus,
            streak: m.gamesMaxWinStreak,
            form: formLetters(m.gamesResults),
          },
        ];
      })
      // fewer than 5 games go after the rest
      .sort(
        (a, b) =>
          Number(b.games >= 5) - Number(a.games >= 5) ||
          b.rate - a.rate ||
          b.games - a.games,
      )
      .map((r, i) => ({ ...r, rank: i + 1 })),
  );

  protected readonly rows = computed(() => this.tq.apply(this.all()));
}
