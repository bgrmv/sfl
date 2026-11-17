import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PlayersService,
  PlayersStatsStore,
  captainRecord,
  lastPlayedGame,
  seasonSaturdays,
  formLetters,
  numberCards,
  playedSeasons,
  pointsPerGame,
  rankingRows,
  ratingOf,
  seasonMetadata,
  signed,
  PlayerChipComponent,
  PlayerHeaderComponent,
} from '@entities/player';
import { getTotalWeeksBySeason } from '@shared/lib/date';
import { seasonKeyOf, seasonLabel } from '@shared/lib/season-label';
import { TableQuery } from '@shared/lib/table-query';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

/**
 * Player page of the design. LIVE: header, numbers, points per game, form, sources of points,
 * Saturdays of the season, seasons table, results as captain (PlayersStatsStore). DUMMY: radar,
 * rivals, head to head and first picks (see `player.radar`, `player.rivals`, `player.captainH2H`).
 */
@Component({
  selector: 'sfl-player-board-page',
  imports: [PlayerChipComponent, PlayerHeaderComponent, RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PlayersService, PlayersStatsStore],
  styles: `
    .sat {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(13, minmax(0, 1fr));
      gap: 4px;
    }
    .sat li {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 2px;
      font-size: 12px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      border: 1px solid var(--sfl-border);
    }
    .sat li.played {
      background: var(--sfl-chip);
      border-color: transparent;
    }
    .sat li.played.win {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
    }
    .sat li.missed {
      color: var(--sfl-muted);
    }
    .sat li.future {
      border-style: dashed;
    }
  `,
  template: `
    <div class="k-page k-page--loose">
      <nav
        class="k-small k-muted"
        aria-label="Breadcrumb"
      >
        <a routerLink="/players">Players</a>
        / {{ player()?.nickname ?? '…' }}
      </nav>

      @if (loading()) {
        <sfl-state kind="loading" />
      } @else if (!player()) {
        <sfl-state
          title="Player not found"
          text="The link is old or the player was removed."
        >
          <a
            sflBtn
            routerLink="/players"
          >
            All players
          </a>
        </sfl-state>
      } @else {
        @let p = player()!;
        <header
          *sflFeature="'player.header'"
          class="k-row"
          style="gap: 20px"
        >
          <sfl-player-header
            class="k-grow"
            [name]="p.nickname"
            [size]="96"
            [accent]="true"
            [level]="1"
          >
            @if (p.number) {
              <span>№ {{ p.number }}</span>
            }
            @if (p.isCaptain) {
              <sfl-badge tone="accent">Captain</sfl-badge>
            }
            <sfl-badge>
              {{ career()?.totalGames ?? 0 }} days in the league
            </sfl-badge>
          </sfl-player-header>
          <div class="k-row">
            <sfl-stat
              [label]="'Points · ' + season()"
              [value]="points()"
              [accent]="true"
            />
            @if (rank()) {
              <sfl-stat
                label="Rank"
                [value]="'#' + rank()"
              />
            }
          </div>
          <a
            sflBtn
            variant="ghost"
            routerLink="/compare"
          >
            ⇄ Compare with another player
          </a>
        </header>

        <div class="k-row">
          <sfl-segmented
            label="Tab"
            [options]="tabs()"
            [value]="tab()"
            (changed)="tab.set($event)"
          />
          <sfl-segmented
            label="Season"
            [options]="seasons()"
            [value]="season()"
            (changed)="picked.set(seasonKeyOf($event))"
          />
        </div>

        @if (tab() === 'Player') {
          @if (!meta()) {
            <sfl-state
              title="No games yet"
              text="Numbers and charts appear after the first published game of the season."
            />
          } @else {
            <sfl-section
              *sflFeature="'player.numbers'"
              flag="player.numbers"
              title="Numbers"
            >
              <div class="k-grid-sm">
                @for (n of numbers(); track n.label) {
                  <sfl-stat
                    [label]="n.label"
                    [value]="n.value"
                    [sub]="n.sub"
                    [tip]="n.tip"
                  />
                }
              </div>
              <p class="k-hint">
                +/− is team goals minus rival goals per game, summed. LR is +1
                for a win, −1 for a loss, 0 for a draw. A header goal counts
                double.
              </p>
            </sfl-section>

            <sfl-section
              *sflFeature="'player.charts'"
              flag="player.charts"
              title="Form and trend"
            >
              <div class="k-grid">
                <sfl-card
                  [sub]="true"
                  title="Points per game"
                >
                  @if (bars().length) {
                    <sfl-bars
                      [bars]="bars()"
                      label="Points per game of the season"
                    />
                    <p class="k-hint">
                      Accent bars are wins; the label is the game number.
                    </p>
                  } @else {
                    <p class="k-muted k-small">
                      The chart is shown for one season.
                    </p>
                  }
                </sfl-card>
                <sfl-card
                  [sub]="true"
                  title="Saturdays of the season"
                >
                  @if (saturdays().length) {
                    <ul
                      class="sat"
                      [attr.aria-label]="
                        saturdays().length +
                        ' Saturdays; the number is points in the game'
                      "
                    >
                      @for (w of saturdays(); track w.n) {
                        <li
                          [class]="w.state"
                          [class.win]="w.win"
                          [title]="
                            'Game ' +
                            w.n +
                            ': ' +
                            (w.state === 'played'
                              ? w.points + ' points' + (w.win ? ', win' : '')
                              : w.state === 'missed'
                                ? 'did not play'
                                : 'not played yet')
                          "
                        >
                          {{
                            w.state === 'played'
                              ? w.points
                              : w.state === 'missed'
                                ? '–'
                                : ''
                          }}
                        </li>
                      }
                    </ul>
                    <div class="k-row k-hint">
                      <span>Number: points</span>
                      <span>Accent: win</span>
                      <span>–: did not play</span>
                      <span>Empty: not played yet</span>
                    </div>
                  } @else {
                    <p class="k-muted k-small">
                      The grid is shown for one season.
                    </p>
                  }
                  <div class="k-row">
                    <span class="k-label">Last five</span>
                    <sfl-form-dots [form]="form()" />
                    <span class="k-small k-muted">
                      Best win streak: {{ meta()?.gamesMaxWinStreak }}
                    </span>
                  </div>
                </sfl-card>
                <sfl-card
                  *sflFeature="'player.radar'"
                  flag="player.radar"
                  [sub]="true"
                  title="Style of play"
                >
                  <!-- DUMMY (player.radar): the league average per axis needs league totals -->
                  <sfl-radar [axes]="radar" />
                </sfl-card>
              </div>
            </sfl-section>

            <sfl-section
              *sflFeature="'player.charts'"
              title="Where the points come from"
            >
              <div class="k-grid">
                <sfl-card
                  [sub]="true"
                  title="Points by source, season"
                >
                  @for (s of sources(); track s.t) {
                    <div class="k-row k-between">
                      <span>{{ s.t }}</span>
                      <b class="k-num">{{ s.v }}</b>
                    </div>
                  }
                </sfl-card>
                <sfl-card
                  [sub]="true"
                  title="First and second draft"
                >
                  <sfl-split-bar
                    [a]="draft().first"
                    [b]="draft().second"
                    aLabel="1st draft"
                    bLabel="2nd draft"
                  />
                  <p class="k-hint">
                    Games played in the team that picked first or second.
                  </p>
                </sfl-card>
              </div>
            </sfl-section>
          }

          <sfl-section
            *sflFeature="'player.rivals'"
            flag="player.rivals"
            title="Opponents and allies"
          >
            <!-- DUMMY (player.rivals): rivals and allies need the history of games with both squads -->
            <div class="k-grid">
              <sfl-card
                [sub]="true"
                title="Toughest opponents"
              >
                <ul class="k-list">
                  @for (r of rivals; track r.name) {
                    <li>
                      <sfl-player-chip
                        class="k-grow"
                        [name]="r.name"
                        [size]="28"
                      />
                      <span class="k-muted k-small">{{ r.rec }}</span>
                      <b>{{ r.pct }}%</b>
                    </li>
                  }
                </ul>
                <p class="k-hint">At least 5 games.</p>
              </sfl-card>
              <sfl-card
                [sub]="true"
                title="Best allies"
              >
                <ul class="k-list">
                  @for (r of rivals.slice().reverse(); track r.name) {
                    <li>
                      <sfl-player-chip
                        class="k-grow"
                        [name]="r.name"
                        [size]="28"
                      />
                      <span class="k-muted k-small">{{ r.rec }}</span>
                      <b>{{ 100 - r.pct }}%</b>
                    </li>
                  }
                </ul>
              </sfl-card>
            </div>
          </sfl-section>

          <sfl-section
            *sflFeature="'player.seasons'"
            flag="player.seasons"
            title="Seasons"
          >
            <div class="k-scroll">
              <table class="k-table">
                <caption class="k-visually-hidden">
                  Statistics by season
                </caption>
                <thead>
                  <tr>
                    <th
                      sflSortKey="year"
                      [query]="tq"
                    >
                      Season
                    </th>
                    <th
                      sflSortKey="games"
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
                      sflSortKey="points"
                      [query]="tq"
                      class="r"
                    >
                      Points
                    </th>
                    <th
                      sflSortKey="pm"
                      [query]="tq"
                      class="r"
                    >
                      +/−
                    </th>
                    <th
                      sflSortKey="mvp"
                      [query]="tq"
                      class="r"
                    >
                      MVP
                    </th>
                    <th
                      sflSortKey="lr"
                      [query]="tq"
                      class="r"
                    >
                      LR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of sortedSeasons(); track s.season) {
                    <tr>
                      <td>{{ s.season }}</td>
                      <td class="r">{{ s.games }}</td>
                      <td class="r">{{ s.goals }}</td>
                      <td class="r">{{ s.passes }}</td>
                      <td class="r">{{ s.points }}</td>
                      <td class="r">{{ signed(s.pm) }}</td>
                      <td class="r">{{ s.mvp }}</td>
                      <td class="r">{{ signed(s.lr) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="k-hint">
              Days are the Saturdays the player took part in. Only published
              games count.
            </p>
          </sfl-section>
        } @else {
          <sfl-section
            *sflFeature="'player.captainTab'"
            flag="player.captainTab"
            title="Results and draft"
          >
            <div class="k-grid">
              <sfl-card
                [sub]="true"
                title="Results as captain, by season"
              >
                <ul class="k-list">
                  @for (r of captainRows(); track r.y) {
                    <li>
                      <b>{{ r.y }}</b>
                      <span class="k-grow"></span>
                      {{ r.w }} W · {{ r.d }} D · {{ r.l }} L · {{ r.rate }}%
                    </li>
                  } @empty {
                    <li class="k-muted">No games as captain yet.</li>
                  }
                </ul>
                <p class="k-hint">
                  W win, D draw, L loss. Only published games count.
                </p>
              </sfl-card>
              <sfl-card
                [sub]="true"
                title="First and second draft"
              >
                <sfl-split-bar
                  [a]="draft().first"
                  [b]="draft().second"
                  aLabel="1st draft"
                  bLabel="2nd draft"
                />
                <p class="k-hint">
                  First draft is the team of the captain who picked first.
                </p>
              </sfl-card>
            </div>
          </sfl-section>
          <sfl-section
            *sflFeature="'player.captainH2H'"
            flag="player.captainH2H"
            title="Rival captains and picks"
          >
            <!-- DUMMY (player.captainH2H): needs the captains of every game and the draft order -->
            <div class="k-scroll">
              <table class="k-table">
                <caption class="k-visually-hidden">
                  Record against other captains
                </caption>
                <thead>
                  <tr>
                    <th>Captain</th>
                    <th class="r">Games</th>
                    <th class="r">W–D–L</th>
                    <th class="r">+/−</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Wolf</td>
                    <td class="r">8</td>
                    <td class="r">4–1–3</td>
                    <td class="r">+2</td>
                  </tr>
                  <tr>
                    <td>Tank</td>
                    <td class="r">7</td>
                    <td class="r">3–2–2</td>
                    <td class="r">+1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </sfl-section>
        }
      }
    </div>
  `,
})
export class PlayerBoardPageComponent {
  private readonly store = inject(PlayersStatsStore);
  readonly id = input('');
  protected readonly seasonKeyOf = seasonKeyOf;
  protected readonly loading = this.store.loading;
  protected readonly system = inject(RatingSystemStore).system;
  protected readonly tab = signal('Player');
  protected readonly picked = signal<string | null>(null);

  protected readonly player = computed(
    () => this.store.playersEntities().find(p => p.id === this.id()) ?? null,
  );
  protected readonly tabs = computed(() =>
    this.player()?.isCaptain ? ['Player', 'As captain'] : ['Player'],
  );
  private readonly keys = computed(() => {
    const p = this.player();
    return p ? [...playedSeasons(p), 'all'] : ['all'];
  });
  protected readonly seasons = computed(() => this.keys().map(seasonLabel));
  private readonly key = computed(() => this.picked() ?? this.keys()[0]);
  protected readonly season = computed(() => seasonLabel(this.key()));

  protected readonly meta = computed(() => {
    const p = this.player();
    return p ? seasonMetadata(p, this.key()) : null;
  });
  protected readonly career = computed(() => {
    const p = this.player();
    return p ? seasonMetadata(p, 'all') : null;
  });
  protected readonly rank = computed(
    () =>
      rankingRows(this.store.playersEntities(), this.key(), this.system()).find(
        r => r.id === this.id(),
      )?.rank ?? null,
  );
  protected readonly points = computed(() => {
    const m = this.meta();
    return m ? ratingOf(m, this.system()).totalPoints : 0;
  });
  protected readonly numbers = computed(() => {
    const m = this.meta();
    return m ? numberCards(m, this.system(), this.rank()) : [];
  });
  protected readonly bars = computed(() => {
    const p = this.player();
    return p && this.key() !== 'all' ? pointsPerGame(p, this.key()) : [];
  });
  protected readonly saturdays = computed(() => {
    const p = this.player();
    const key = this.key();
    return p && key !== 'all'
      ? seasonSaturdays(
          p,
          key,
          getTotalWeeksBySeason(Number(key)),
          lastPlayedGame(this.store.playersEntities(), key),
        )
      : [];
  });
  protected readonly form = computed(() =>
    formLetters(this.meta()?.gamesResults ?? []),
  );
  protected readonly sources = computed(() => {
    const m = this.meta();
    return m
      ? [
          { t: 'Goals by foot', v: m.totalGoalsByLeg },
          { t: 'Goals by head (×2 points)', v: m.totalGoalsByHead },
          { t: 'Penalties', v: m.totalGoalsByPenalty },
          { t: 'Passes', v: m.totalPasses },
          { t: 'Own goals (−1 each)', v: m.totalGoalsByAuto },
        ]
      : [];
  });
  protected readonly seasonRows = computed(() => {
    const p = this.player();
    if (!p) {
      return [];
    }
    return playedSeasons(p).map(y => {
      const m = seasonMetadata(p, y)!;
      const r = ratingOf(m, this.system());
      return {
        year: Number(y),
        season: seasonLabel(y),
        games: m.totalGames,
        goals: m.totalGoals,
        passes: m.totalPasses,
        points: r.totalPoints,
        pm: r.plusMinus,
        mvp: m.totalMvp,
        lr: r.lastResult,
      };
    });
  });
  protected readonly tq = new TableQuery([]);
  protected readonly signed = signed;
  protected readonly sortedSeasons = computed(() =>
    this.tq.apply(this.seasonRows()),
  );
  protected readonly captainRows = computed(() => {
    const p = this.player();
    if (!p) {
      return [];
    }
    return playedSeasons(p)
      .map(y => ({
        y: seasonLabel(y),
        ...captainRecord(seasonMetadata(p, y)!),
      }))
      .filter(r => r.games > 0);
  });
  protected readonly draft = computed(() => ({
    first: this.meta()?.totalPlayedAsFirstDraft ?? 0,
    second: this.meta()?.totalPlayedAsSecondDraft ?? 0,
  }));

  // ---- DUMMY (player.radar, player.rivals): not derivable from the player metadata
  protected readonly radar = [
    { t: 'Goals', a: 0.9, b: 0.5 },
    { t: 'Passes', a: 0.4, b: 0.5 },
    { t: 'Headers', a: 0.8, b: 0.4 },
    { t: 'Wins', a: 0.7, b: 0.5 },
    { t: 'MVP', a: 0.85, b: 0.3 },
    { t: 'Presence', a: 1, b: 0.7 },
  ];
  protected readonly rivals = [
    { name: 'Wolf', rec: '2–1–5', pct: 25 },
    { name: 'Tank', rec: '3–1–4', pct: 38 },
    { name: 'Hawk', rec: '4–2–3', pct: 44 },
  ];
}
