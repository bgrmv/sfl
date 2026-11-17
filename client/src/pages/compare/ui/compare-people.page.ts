import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  PlayersService,
  PlayersStatsStore,
  allSeasons,
  rankingRows,
  signed,
  type RankingRow,
} from '@entities/player';
import { seasonKeyOf, seasonLabel } from '@shared/lib/season-label';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

/**
 * Compare two players. LIVE (compare.people): numbers and form from PlayersStatsStore.
 * DUMMY: games together and against each other (`compare.together`, needs the game history)
 * and the captains mode.
 */
@Component({
  selector: 'sfl-compare-people-page',
  imports: [...KIT],
  providers: [PlayersService, PlayersStatsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="k-page">
      <sfl-page-head
        title="Compare"
        lead="Two players side by side: numbers, form, and the games they played with and against each other."
      >
        <button
          sflBtn
          variant="ghost"
          type="button"
          (click)="swap()"
        >
          ⇄ Swap
        </button>
      </sfl-page-head>
      @if (loading()) {
        <sfl-state kind="loading" />
      } @else {
        <div class="k-row">
          <sfl-segmented
            label="Season"
            [options]="seasons()"
            [value]="season()"
            (changed)="picked.set(seasonKeyOf($event))"
          />
        </div>
        <div class="k-grid">
          @for (side of sides(); track side.key) {
            <sfl-card flag="compare.people">
              <div class="k-field">
                <label [for]="side.key">{{ side.title }}</label>
                <select
                  [id]="side.key"
                  class="k-select"
                  (change)="choose(side.key, $any($event.target).value)"
                >
                  @for (r of rows(); track r.id) {
                    <option
                      [value]="r.id"
                      [selected]="r.id === side.row?.id"
                    >
                      {{ r.name }}
                    </option>
                  }
                </select>
              </div>
              @if (side.row; as r) {
                <div class="k-row">
                  <sfl-avatar
                    [text]="r.ini"
                    [size]="56"
                    [accent]="side.key === 'a'"
                  />
                  <div>
                    <h2>{{ r.name }}</h2>
                    <span class="k-muted k-small">
                      {{ r.no ? '№ ' + r.no : '' }}
                    </span>
                  </div>
                </div>
              }
            </sfl-card>
          }
        </div>

        @if (a() && b()) {
          <sfl-card
            flag="compare.people"
            title="Numbers"
          >
            <table class="k-table">
              <caption class="k-visually-hidden">
                Numbers of two players
              </caption>
              <tbody>
                @for (r of table(); track r.t) {
                  <tr>
                    <td class="r">
                      <b [style.color]="r.a > r.b ? 'var(--sfl-accent)' : ''">
                        {{ r.fa }}
                      </b>
                    </td>
                    <td
                      style="text-align: center"
                      class="k-muted"
                    >
                      {{ r.t }}
                    </td>
                    <td>
                      <b [style.color]="r.b > r.a ? 'var(--sfl-accent)' : ''">
                        {{ r.fb }}
                      </b>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <p class="k-hint">
              The leader of each row is in accent; equal numbers have no leader.
            </p>
          </sfl-card>
          <div class="k-grid">
            <sfl-card
              flag="compare.people"
              title="Form"
            >
              <div class="k-row">
                <b>{{ a()!.name }}</b>
                <sfl-form-dots [form]="a()!.form" />
              </div>
              <div class="k-row">
                <b>{{ b()!.name }}</b>
                <sfl-form-dots [form]="b()!.form" />
              </div>
            </sfl-card>
            <sfl-card
              *sflFeature="'compare.together'"
              flag="compare.together"
              title="Together and against each other"
            >
              <!-- DUMMY (compare.together): needs the squads of every game to count meetings -->
              <div class="k-grid-sm">
                <sfl-stat
                  label="Games"
                  [value]="9"
                />
                <sfl-stat
                  label="A wins"
                  [value]="4"
                />
                <sfl-stat
                  label="Draws"
                  [value]="2"
                />
                <sfl-stat
                  label="B wins"
                  [value]="3"
                />
              </div>
            </sfl-card>
          </div>
        } @else {
          <sfl-state
            title="Choose two players"
            text="Players with games in this season appear in the lists."
          />
        }
      }
    </div>
  `,
})
export class ComparePeoplePageComponent {
  private readonly store = inject(PlayersStatsStore);
  protected readonly loading = this.store.loading;
  protected readonly system = inject(RatingSystemStore).system;
  protected readonly seasonKeyOf = seasonKeyOf;
  protected readonly picked = signal<string | null>(null);
  private readonly chosenA = signal<string | null>(null);
  private readonly chosenB = signal<string | null>(null);

  private readonly keys = computed(() => [
    ...allSeasons(this.store.playersEntities()),
    'all',
  ]);
  protected readonly seasons = computed(() => this.keys().map(seasonLabel));
  private readonly key = computed(() => this.picked() ?? this.keys()[0]);
  protected readonly season = computed(() => seasonLabel(this.key()));

  protected readonly rows = computed(() =>
    rankingRows(this.store.playersEntities(), this.key(), this.system()),
  );
  protected readonly a = computed(
    () =>
      this.rows().find(r => r.id === this.chosenA()) ?? this.rows()[0] ?? null,
  );
  protected readonly b = computed(
    () =>
      this.rows().find(r => r.id === this.chosenB()) ??
      this.rows().find(r => r.id !== this.a()?.id) ??
      null,
  );
  protected readonly sides = computed(() => [
    { key: 'a', title: 'Player A', row: this.a() },
    { key: 'b', title: 'Player B', row: this.b() },
  ]);

  protected readonly table = computed(() => {
    const a = this.a();
    const b = this.b();
    if (!a || !b) {
      return [];
    }
    const row = (
      t: string,
      pick: (r: RankingRow) => number,
      fmt: (n: number) => string = String,
    ) => ({
      t,
      a: pick(a),
      b: pick(b),
      fa: fmt(pick(a)),
      fb: fmt(pick(b)),
    });
    return [
      row('Points', r => r.pts),
      row('Days', r => r.days),
      row('Goals', r => r.goals),
      row('Passes', r => r.passes),
      row('MVP', r => r.mvp),
      row('+/−', r => r.pm, signed),
      row('LR', r => r.lr, signed),
    ];
  });

  choose(side: string, id: string) {
    (side === 'a' ? this.chosenA : this.chosenB).set(id);
  }
  swap() {
    const a = this.a()?.id ?? null;
    this.chosenA.set(this.b()?.id ?? null);
    this.chosenB.set(a);
  }
}
