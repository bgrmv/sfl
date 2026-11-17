import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { GameService, type TPlayerStatisticFinal } from '@entities/game';
import {
  leagueAverage,
  PlayersService,
  PlayersStatsStore,
  strengthInput,
} from '@entities/player';
import { winChance } from '@sfl/domain';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import {
  AUTOSAVE_MS,
  autosaveLabel,
  canAutosave,
  DEFAULT_STATISTIC_VALUES,
  GameLease,
  generatePlayerStatisticID,
  NewGameStore,
  renumber,
  scoreAfter,
} from '@features/game-edit';
import {
  EnumPlayerPosition,
  gameEventViolations,
  type GameEvent,
  type GameEventKind,
} from '@sfl/schemas';
import { KIT } from '@shared/ui/kit';

export const WIZARD_STEPS = [
  'Game',
  'Captains',
  'Draft',
  'Statistics',
  'Goal order',
  'Review',
] as const;

const KIND_LABEL: Record<GameEventKind, string> = {
  goal: 'Goal',
  head: 'Header',
  penalty: 'Penalty',
  own: 'Own goal',
};

/**
 * The match wizard (S10.67): six steps over the same store as the form of a game, so a
 * draft is saved on the server under the lease of the game (S10.54). The goal order sets
 * the goals and passes of the players (S10.27).
 */
@Component({
  selector: 'sfl-admin-wizard-page',
  imports: [RouterLink, DatePipe, ...KIT],
  providers: [
    NewGameStore,
    GameService,
    PlayersService,
    PlayersStatsStore,
    GameLease,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="k-page">
      <sfl-page-head
        [title]="title()"
        lead="Six steps: game, captains, draft, statistics, goal order, review. The draft is saved on the server; publishing needs two confirmations."
      >
        <a
          sflBtn
          variant="ghost"
          routerLink="/games/create"
        >
          Open the classic form
        </a>
      </sfl-page-head>

      @if (lease.state() === 'busy') {
        <p
          class="k-callout"
          role="alert"
        >
          {{ lease.owner() }} is editing this game
          @if (lease.until(); as until) {
            until {{ until | date: 'HH:mm' }}
          }
          . You can look, but not save.
        </p>
      }

      <ol
        class="k-row"
        style="list-style:none;padding:0"
        aria-label="Steps"
      >
        @for (s of steps; track s; let i = $index) {
          <li>
            <button
              sflBtn
              size="sm"
              type="button"
              [variant]="i === step() ? 'primary' : 'ghost'"
              [attr.aria-current]="i === step() ? 'step' : null"
              (click)="step.set(i)"
            >
              {{ i + 1 }} · {{ s }}
            </button>
          </li>
        }
      </ol>

      <sfl-card [title]="steps[step()]">
        @switch (step()) {
          @case (0) {
            <div class="k-grid">
              <div class="k-field">
                <label for="wz-date">Date</label>
                <input
                  id="wz-date"
                  class="k-input"
                  type="date"
                  [value]="dateValue()"
                  (change)="setDate($any($event.target).value)"
                />
              </div>
              <div class="k-field">
                <label for="wz-number">Game number</label>
                <input
                  id="wz-number"
                  class="k-input"
                  type="number"
                  min="1"
                  max="53"
                  [value]="game().number || ''"
                  (change)="setNumber('number', $any($event.target).value)"
                />
              </div>
              <div class="k-field">
                <label for="wz-season">Season</label>
                <input
                  id="wz-season"
                  class="k-input"
                  type="number"
                  [value]="game().season || ''"
                  (change)="setNumber('season', $any($event.target).value)"
                />
              </div>
            </div>
            <p class="k-hint">
              One tour is one game; a season has 52 or 53 tours.
            </p>
          }
          @case (1) {
            <div class="k-grid">
              @for (team of teams(); track team.id) {
                <div class="k-callout">
                  <b class="k-head">{{ team.name }}</b>
                  <div class="k-field">
                    <label [for]="'wz-cap-' + team.id">Captain</label>
                    <select
                      [id]="'wz-cap-' + team.id"
                      class="k-select"
                      (change)="setCaptain(team.id, $any($event.target).value)"
                    >
                      <option
                        value=""
                        [selected]="!captainOf(team.id)"
                      >
                        Choose a player
                      </option>
                      @for (p of players(); track p.id) {
                        <option
                          [value]="p.id"
                          [selected]="p.id === captainOf(team.id)"
                          [disabled]="takenByOther(p.id, team.id)"
                        >
                          {{ p.nickname }}
                        </option>
                      }
                    </select>
                  </div>
                </div>
              }
            </div>
          }
          @case (2) {
            <div class="k-grid">
              <div>
                <h3>Available players · {{ pool().length }}</h3>
                <ul class="k-list">
                  @for (p of pool(); track p.id) {
                    <li>
                      <span class="k-grow">{{ p.nickname }}</span>
                      @for (team of teams(); track team.id; let i = $index) {
                        <button
                          sflBtn
                          size="sm"
                          [variant]="i === 0 ? 'primary' : 'ghost'"
                          type="button"
                          [attr.aria-label]="
                            'Add ' + p.nickname + ' to ' + team.name
                          "
                          (click)="addToTeam(p.id, team.id)"
                        >
                          + {{ team.name }}
                        </button>
                      }
                    </li>
                  }
                </ul>
              </div>
              @for (team of teams(); track team.id) {
                <div>
                  <h3>{{ team.name }} · {{ rowsOf(team.id).length }}</h3>
                  <ol class="k-small">
                    @for (r of rowsOf(team.id); track r.id) {
                      <li>
                        {{ r.playerData.nickname }}
                        @if (r.isCaptain) {
                          (captain)
                        } @else {
                          <button
                            sflBtn
                            size="sm"
                            variant="ghost"
                            type="button"
                            [attr.aria-label]="
                              'Remove ' + r.playerData.nickname
                            "
                            (click)="store.removeStatisticPlayer(r.id)"
                          >
                            Remove
                          </button>
                        }
                      </li>
                    }
                  </ol>
                </div>
              }
            </div>
          }
          @case (3) {
            @if (hasOrder()) {
              <p class="k-callout">
                The goals and passes come from the goal order. Clear the order
                to type the totals by hand.
              </p>
            }
            @if (withoutPosition().length) {
              <p
                class="k-callout"
                role="status"
              >
                {{ withoutPosition()[0].playerData.nickname }}
                @if (withoutPosition().length > 1) {
                  and {{ withoutPosition().length - 1 }} more
                }
                have no position. Publishing is blocked until every player has
                one.
              </p>
            }
            <table class="k-table">
              <caption class="k-visually-hidden">Players of the game</caption>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Goals</th>
                  <th>Header</th>
                  <th>Penalty</th>
                  <th>Passes</th>
                  <th>MVP</th>
                </tr>
              </thead>
              <tbody>
                @for (r of rows(); track r.id) {
                  <tr>
                    <td>{{ teamName(r.teamId) }}</td>
                    <td>{{ r.playerData.nickname }}</td>
                    <td>
                      <select
                        class="k-select"
                        style="width:110px"
                        [attr.aria-label]="
                          'Position of ' + r.playerData.nickname
                        "
                        (change)="
                          store.changePosition(r, $any($event.target).value)
                        "
                      >
                        <option
                          value=""
                          [selected]="!r.position"
                        >
                          —
                        </option>
                        @for (o of positions; track o) {
                          <option
                            [value]="o"
                            [selected]="o === r.position"
                          >
                            {{ o }}
                          </option>
                        }
                      </select>
                    </td>
                    @for (f of fields; track f.key) {
                      <td>
                        <input
                          class="k-input"
                          style="width:60px"
                          type="number"
                          min="0"
                          [disabled]="hasOrder()"
                          [value]="r[f.key] ?? 0"
                          [attr.aria-label]="
                            f.label + ' of ' + r.playerData.nickname
                          "
                          (change)="
                            setStat(r, f.key, $any($event.target).value)
                          "
                        />
                      </td>
                    }
                    <td>
                      <input
                        type="checkbox"
                        [checked]="r.isMVP"
                        [attr.aria-label]="'MVP ' + r.playerData.nickname"
                        (change)="store.toggleIsMVP(r)"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @case (4) {
            <p class="k-muted">
              Each goal is three choices: the team, the scorer, the passers. The
              totals of the players follow the order.
            </p>
            <ol
              class="k-list"
              aria-label="Goals in order"
            >
              @for (e of events(); track e.n; let i = $index) {
                <li>
                  <b class="k-num">{{ scores()[i][0] }}:{{ scores()[i][1] }}</b>
                  <span class="k-grow">
                    {{ teamName(e.teamId) }} · {{ nick(e.authorId) }} ({{
                      kindLabel[e.kind].toLowerCase()
                    }})
                    @if (e.assistIds.length) {
                      · pass {{ passers(e) }}
                    }
                  </span>
                  <button
                    sflBtn
                    size="sm"
                    variant="ghost"
                    type="button"
                    [disabled]="i === 0"
                    [attr.aria-label]="'Move goal ' + e.n + ' up'"
                    (click)="move(i, -1)"
                  >
                    ↑
                  </button>
                  <button
                    sflBtn
                    size="sm"
                    variant="ghost"
                    type="button"
                    [disabled]="i === events().length - 1"
                    [attr.aria-label]="'Move goal ' + e.n + ' down'"
                    (click)="move(i, 1)"
                  >
                    ↓
                  </button>
                  <button
                    sflBtn
                    size="sm"
                    variant="ghost"
                    type="button"
                    [attr.aria-label]="'Remove goal ' + e.n"
                    (click)="removeGoal(i)"
                  >
                    Remove
                  </button>
                </li>
              }
            </ol>

            <fieldset class="k-grid">
              <legend>Add a goal</legend>
              <div class="k-field">
                <label for="wz-team">Team</label>
                <select
                  id="wz-team"
                  class="k-select"
                  (change)="
                    goalTeam.set($any($event.target).value);
                    goalAuthor.set('');
                    goalAssists.set([])
                  "
                >
                  <option
                    value=""
                    [selected]="!goalTeam()"
                  >
                    Choose a team
                  </option>
                  @for (t of teams(); track t.id) {
                    <option
                      [value]="t.id"
                      [selected]="t.id === goalTeam()"
                    >
                      {{ t.name }}
                    </option>
                  }
                </select>
              </div>
              <div class="k-field">
                <label for="wz-kind">Kind</label>
                <select
                  id="wz-kind"
                  class="k-select"
                  (change)="
                    goalKind.set($any($event.target).value);
                    goalAuthor.set('');
                    goalAssists.set([])
                  "
                >
                  @for (k of kinds; track k) {
                    <option
                      [value]="k"
                      [selected]="k === goalKind()"
                    >
                      {{ kindLabel[k] }}
                    </option>
                  }
                </select>
              </div>
              <div class="k-field">
                <label for="wz-author">Scorer</label>
                <select
                  id="wz-author"
                  class="k-select"
                  (change)="
                    goalAuthor.set($any($event.target).value);
                    goalAssists.set([])
                  "
                >
                  <option
                    value=""
                    [selected]="!goalAuthor()"
                  >
                    Choose a player
                  </option>
                  @for (r of authorOptions(); track r.id) {
                    <option
                      [value]="r.playerId"
                      [selected]="r.playerId === goalAuthor()"
                    >
                      {{ r.playerData.nickname }}
                    </option>
                  }
                </select>
              </div>
              @if (goalKind() !== 'own') {
                @for (slot of [0, 1, 2]; track slot) {
                  <div class="k-field">
                    <label [for]="'wz-pass-' + slot">Pass {{ slot + 1 }}</label>
                    <select
                      [id]="'wz-pass-' + slot"
                      class="k-select"
                      (change)="setAssist(slot, $any($event.target).value)"
                    >
                      <option
                        value=""
                        [selected]="!goalAssists()[slot]"
                      >
                        None
                      </option>
                      @for (r of assistOptions(); track r.id) {
                        <option
                          [value]="r.playerId"
                          [selected]="r.playerId === goalAssists()[slot]"
                        >
                          {{ r.playerData.nickname }}
                        </option>
                      }
                    </select>
                  </div>
                }
              }
            </fieldset>
            <div class="k-row">
              <button
                sflBtn
                type="button"
                [disabled]="!canAddGoal()"
                (click)="addGoal()"
              >
                Add goal
              </button>
              @if (hasOrder()) {
                <button
                  sflBtn
                  variant="ghost"
                  type="button"
                  (click)="store.setEvents(null)"
                >
                  Clear the order
                </button>
              }
            </div>
            <p class="k-hint">
              Up to 3 passes per goal, all from the scoring team, none of them
              the scorer. A pass before a header is worth 2.
            </p>
            <ul
              class="k-list"
              aria-live="polite"
              aria-label="Problems of the order"
            >
              @for (v of orderProblems(); track v.path) {
                <li>✗ {{ v.message }}</li>
              }
            </ul>
          }
          @default {
            <h3>Checks</h3>
            <ul
              class="k-list"
              aria-label="Checks"
            >
              @for (c of checks(); track c.text) {
                <li>{{ c.ok ? '✓' : '✗' }} {{ c.text }}</li>
              }
            </ul>
            @if (chance(); as c) {
              <h3>Estimate before the game</h3>
              <p aria-label="Win chance estimate">
                <b class="k-num">{{ teams()[0].name }} {{ c.a }}%</b>
                ·
                <b class="k-num">{{ teams()[1].name }} {{ c.b }}%</b>
                <span class="k-muted">(estimate)</span>
              </p>
              <p class="k-hint">
                An estimate, not a bet. It comes from the points and games of
                the players in the chosen scoring system this season, pulled to
                the league average while a player has few games, plus a quarter
                of his last game. It never goes below 25% or above 75%.
              </p>
            }
            <h3>What publishing changes</h3>
            <p class="k-small k-muted">
              After two confirmations of two different people the game counts in
              the ratings of the season and of the career. A published game
              returns to a draft only by a revoke with a reason.
            </p>
            <div class="k-row">
              <button
                sflBtn
                type="button"
                [disabled]="!canSave()"
                (click)="save()"
              >
                {{ store.saving() ? 'Saving…' : 'Save draft' }}
              </button>
              @if (game().id) {
                <a
                  sflBtn
                  variant="ghost"
                  routerLink="/admin/confirm"
                >
                  Go to confirmation
                </a>
              }
            </div>
          }
        }
        @if (autosaveLabel()) {
          <p
            class="k-hint"
            role="status"
          >
            {{ autosaveLabel() }}
          </p>
        }
        <div class="k-row k-between">
          <button
            sflBtn
            variant="ghost"
            type="button"
            [disabled]="step() === 0"
            (click)="step.set(step() - 1)"
          >
            ← Back
          </button>
          <button
            sflBtn
            type="button"
            [disabled]="step() === steps.length - 1"
            (click)="step.set(step() + 1)"
          >
            Next: {{ steps[next()] }} →
          </button>
        </div>
      </sfl-card>
    </div>
  `,
})
export class AdminWizardPageComponent {
  protected readonly store = inject(NewGameStore);
  private readonly stats = inject(PlayersStatsStore);
  private readonly rating = inject(RatingSystemStore);
  protected readonly lease = inject(GameLease);

  protected readonly steps = WIZARD_STEPS;
  protected readonly kinds: GameEventKind[] = [
    'goal',
    'head',
    'penalty',
    'own',
  ];
  protected readonly kindLabel = KIND_LABEL;
  protected readonly positions = Object.values(EnumPlayerPosition);
  protected readonly fields = [
    { key: 'goalsByLeg', label: 'Goals' },
    { key: 'goalsByHead', label: 'Headers' },
    { key: 'goalsByPenalty', label: 'Penalties' },
    { key: 'passes', label: 'Passes' },
  ] as const;

  protected readonly step = signal(0);
  protected readonly next = computed(() =>
    Math.min(this.step() + 1, this.steps.length - 1),
  );

  protected readonly game = this.store.game;
  protected readonly teams = this.store.teamsEntities;
  protected readonly players = this.store.playersEntities;
  protected readonly rows = this.store.statisticsEntities;
  protected readonly events = computed<GameEvent[]>(
    () => this.game().events ?? [],
  );
  protected readonly hasOrder = computed(() => this.events().length > 0);

  protected readonly title = computed(() => {
    const { number, season } = this.game();
    return number && season ? `Game ${number} · season ${season}` : 'New game';
  });
  protected readonly dateValue = computed(() => {
    const date = new Date(this.game().playedAt);
    return Number.isNaN(date.getTime())
      ? ''
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });

  // The form of a goal
  protected readonly goalTeam = signal('');
  protected readonly goalKind = signal<GameEventKind>('goal');
  protected readonly goalAuthor = signal('');
  protected readonly goalAssists = signal<string[]>([]);

  protected readonly pool = computed(() => {
    const taken = new Set(this.rows().map(r => r.playerId));
    return this.players().filter(p => !taken.has(p.id));
  });
  protected readonly withoutPosition = computed(() =>
    this.rows().filter(r => !r.position),
  );
  protected readonly scores = computed(() =>
    scoreAfter(this.events(), this.teamIds()),
  );
  protected readonly orderProblems = computed(() =>
    gameEventViolations({
      teams: this.teams(),
      statistics: this.rows(),
      events: this.events(),
    }),
  );

  /** The scorer of an own goal plays for the rivals of the team of the goal. */
  protected readonly authorOptions = computed(() =>
    this.rows().filter(r =>
      this.goalKind() === 'own'
        ? r.teamId !== this.goalTeam()
        : r.teamId === this.goalTeam(),
    ),
  );
  protected readonly assistOptions = computed(() =>
    this.rows().filter(
      r => r.teamId === this.goalTeam() && r.playerId !== this.goalAuthor(),
    ),
  );
  protected readonly canAddGoal = computed(
    () => !!this.goalTeam() && !!this.goalAuthor(),
  );

  protected readonly checks = computed(() => {
    const teams = this.teams();
    const captains = (id: string) =>
      this.rows().filter(r => r.teamId === id && r.isCaptain).length;
    return [
      {
        text: 'Both teams have players',
        ok:
          teams.length === 2 && teams.every(t => this.rowsOf(t.id).length > 0),
      },
      {
        text: 'One captain in each team',
        ok: teams.length === 2 && teams.every(t => captains(t.id) === 1),
      },
      {
        text: 'Every player has a position',
        ok: this.rows().length > 0 && this.withoutPosition().length === 0,
      },
      {
        text: 'A game number and a season',
        ok: !!this.game().number && !!this.game().season,
      },
      { text: 'An MVP is chosen', ok: this.rows().some(r => r.isMVP) },
      {
        text: 'The goal order matches the totals',
        ok: this.orderProblems().length === 0,
      },
    ];
  });
  /** The estimate of the squads (GLOSSARY: win chance); none until both squads exist. */
  protected readonly chance = computed(() => {
    const [first, second] = this.teams();
    if (!first || !second) return null;
    const system = this.rating.system();
    const season = String(this.game().season);
    const everybody = this.stats.playersEntities();
    const squad = (teamId: string) =>
      this.rowsOf(teamId).map(r =>
        strengthInput(
          everybody.find(p => p.id === r.playerId) ?? r.playerData,
          system,
          season,
        ),
      );
    const a = squad(first.id);
    const b = squad(second.id);
    if (!a.length || !b.length) return null;
    return winChance(a, b, leagueAverage(everybody, system, season));
  });
  protected readonly canSave = computed(
    () =>
      !this.store.saving() &&
      this.lease.state() !== 'busy' &&
      !!this.game().number &&
      !!this.game().season &&
      this.store.errors().size === 0 &&
      this.orderProblems().length === 0,
  );

  constructor() {
    // The lease of a saved game is taken when it is loaded and renewed by a pulse
    effect(() => {
      const id = this.store.gameId();
      if (id) this.lease.start(id);
    });
    // A draft is saved by itself a few seconds after the last change (S10.54)
    toObservable(this.store.game)
      .pipe(debounceTime(AUTOSAVE_MS), takeUntilDestroyed())
      .subscribe(() => {
        if (canAutosave(this.autosaveInput())) this.store.updateGame();
      });
  }

  private readonly autosaveInput = computed(() => ({
    mode: this.store.mode(),
    lease: this.lease.state(),
    valid:
      this.store.errors().size === 0 &&
      this.orderProblems().length === 0 &&
      !!this.game().number &&
      !!this.game().season,
    changed: this.store.isFormChanged(),
    saving: this.store.saving(),
  }));
  protected readonly autosaveLabel = computed(() =>
    autosaveLabel(this.autosaveInput()),
  );

  private teamIds = computed<[string, string]>(() => [
    this.teams()[0]?.id ?? '',
    this.teams()[1]?.id ?? '',
  ]);

  protected rowsOf(teamId: string) {
    return this.rows().filter(r => r.teamId === teamId);
  }
  protected teamName(id: string) {
    return this.teams().find(t => t.id === id)?.name ?? '';
  }
  protected nick(playerId: string) {
    return this.players().find(p => p.id === playerId)?.nickname ?? '';
  }
  protected passers(e: GameEvent) {
    return e.assistIds.map(id => this.nick(id)).join(', ');
  }
  protected captainOf(teamId: string) {
    return this.rows().find(r => r.teamId === teamId && r.isCaptain)?.playerId;
  }
  protected takenByOther(playerId: string, teamId: string) {
    return this.rows().some(
      r => r.playerId === playerId && r.teamId !== teamId,
    );
  }

  protected setDate(value: string) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      this.store.updateGameFields({ playedAt: date });
    }
  }
  protected setNumber(key: 'number' | 'season', value: string) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) this.store.updateGameFields({ [key]: parsed });
  }

  /** A player put at the captain place takes the row of the team and the badge. */
  protected setCaptain(teamId: string, playerId: string) {
    if (!playerId) return;
    const id = generatePlayerStatisticID({ teamId, playerId });
    if (!this.rows().some(r => r.id === id)) this.addToTeam(playerId, teamId);
    this.store.toggleIsCaptain({ id, teamId } as never);
  }
  protected addToTeam(playerId: string, teamId: string) {
    const playerData = this.players().find(p => p.id === playerId);
    if (!playerData) return;
    this.store.addStatisticPlayer({
      ...DEFAULT_STATISTIC_VALUES,
      playerId,
      teamId,
      playerData,
    } as TPlayerStatisticFinal);
  }
  protected setStat(
    row: TPlayerStatisticFinal,
    key: 'goalsByLeg' | 'goalsByHead' | 'goalsByPenalty' | 'passes',
    value: string,
  ) {
    const next = Math.max(0, Math.trunc(Number(value) || 0));
    this.store.patchNumberKeysStatistics({
      statistic: row as never,
      number: next - (row[key] ?? 0),
      key,
    });
  }

  protected setAssist(slot: number, playerId: string) {
    const next = [...this.goalAssists()];
    next[slot] = playerId;
    this.goalAssists.set([...new Set(next.filter(Boolean))]);
  }
  protected addGoal() {
    if (!this.canAddGoal()) return;
    const event: GameEvent = {
      n: this.events().length + 1,
      kind: this.goalKind(),
      teamId: this.goalTeam(),
      authorId: this.goalAuthor(),
      assistIds: this.goalKind() === 'own' ? [] : this.goalAssists(),
    };
    this.store.setEvents([...this.events(), event]);
    this.goalAuthor.set('');
    this.goalAssists.set([]);
  }
  protected removeGoal(i: number) {
    this.store.setEvents(
      renumber(this.events().filter((_, index) => index !== i)),
    );
  }
  protected move(i: number, by: -1 | 1) {
    const list = [...this.events()];
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.store.setEvents(renumber(list));
  }

  protected save() {
    if (this.game().id) this.store.updateGame();
    else this.store.saveGame();
  }
}
