import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { GamesStore } from '@entities/game';
import { nextSaturday } from '@shared/lib/saturdays';
import { KIT } from '@shared/ui/kit';

/**
 * Overview (board Dashboard). LIVE (admin.dashboard): the next Saturday, games to publish, the
 * season numbers and the goals chart come from GamesStore (provided by the admin layout).
 * DUMMY (admin.dashboardFeed): comments to review and the action log.
 */
@Component({
  selector: 'sfl-admin-dashboard-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .kpis {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    .kpis li {
      background: var(--sfl-surface);
      border: 1px solid var(--sfl-border);
      border-radius: var(--sfl-radius);
      padding: 14px 16px;
    }
    .kpis li.accent {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
      border-color: var(--sfl-accent);
    }
    .kpis .l {
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .kpis .v {
      font: 700 31px/1.15 var(--sfl-font-head);
    }
    .kpis .n {
      font-size: 13px;
      opacity: 0.85;
    }
    .box {
      list-style: none;
      margin: 0;
      padding: 0;
      background: var(--sfl-surface);
      border: 1px solid var(--sfl-border);
      border-radius: var(--sfl-radius);
      overflow: hidden;
    }
    .box > li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      padding: 12px 16px;
      border-top: 1px solid var(--sfl-border);
    }
    .box > li:first-child {
      border-top: 0;
    }
    .chain {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .chain li {
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--sfl-chip);
      color: var(--sfl-muted);
    }
    .chain li[aria-current='step'] {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
    }
    .cards {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cards li {
      background: var(--sfl-surface);
      border: 1px solid var(--sfl-border);
      border-radius: var(--sfl-radius);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cols {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: flex-start;
    }
    .cols > section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
  `,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.dashboard'"
    >
      <sfl-page-head title="Overview">
        <a
          sflBtn
          routerLink="/admin/wizard"
        >
          <sfl-icon name="plus" />
          Create game
        </a>
      </sfl-page-head>

      <ul class="kpis">
        <li class="accent">
          <div class="l">Next game</div>
          <div class="v">{{ nextLabel }}</div>
          <div class="n">Squads not drafted yet</div>
        </li>
        <li>
          <div class="l">To publish</div>
          <div class="v">{{ toPublish().length }}</div>
          <div class="n">{{ publishNote() }}</div>
        </li>
        <li>
          <!-- DUMMY (admin.dashboardFeed): comments are not built yet (S10.22) -->
          <div class="l">Comments</div>
          <div class="v">5</div>
          <div class="n">waiting for review</div>
        </li>
        <li>
          <div class="l">Season {{ season }}</div>
          <div class="v">{{ published().length }}</div>
          <div class="n">games published</div>
        </li>
      </ul>

      <div class="k-grid">
        <sfl-card
          flag="admin.dashboard"
          title="Goals per game"
        >
          @if (bars().length) {
            <sfl-bars
              [bars]="bars()"
              [height]="110"
              label="Goals per published game of the season"
            />
            <p class="k-hint">
              The label is the game number; accent bars are decided games.
            </p>
          } @else {
            <sfl-state
              title="No published games"
              text="The chart appears after the first published game."
            />
          }
        </sfl-card>
        <sfl-card
          flag="admin.dashboard"
          title="Games of the season"
        >
          <sfl-split-bar
            [a]="published().length"
            [b]="toPublish().length"
            aLabel="Published"
            bLabel="To publish"
          />
          <div class="k-row">
            <sfl-badge tone="accent">
              {{ published().length }} published
            </sfl-badge>
            <sfl-badge tone="outline">
              {{ toPublish().length }} to publish
            </sfl-badge>
            <sfl-sparkline
              [values]="trend()"
              label="Goals, cumulative"
            />
          </div>
        </sfl-card>
      </div>

      <section
        aria-labelledby="todo"
        class="k-col"
      >
        <h2 id="todo">Games that need action</h2>
        <ul class="box">
          @for (g of todo(); track g.key) {
            <li>
              <div style="flex: 1 1 200px; min-width: 0">
                <div style="font-weight: 700">
                  Game {{ g.number }} · {{ g.teams }}
                </div>
                <div class="k-muted k-small">
                  {{ g.date }} · {{ g.problem }}
                </div>
              </div>
              <ol
                class="chain"
                aria-label="Status"
              >
                @for (s of steps; track s; let i = $index) {
                  <li [attr.aria-current]="i === g.step ? 'step' : null">
                    {{ s }}
                  </li>
                }
              </ol>
              <div class="k-row">
                <a
                  sflBtn
                  variant="ghost"
                  [routerLink]="g.secondaryLink"
                >
                  {{ g.secondary }}
                </a>
                <a
                  sflBtn
                  [routerLink]="g.primaryLink"
                >
                  {{ g.primary }}
                </a>
              </div>
            </li>
          }
        </ul>
      </section>

      <div
        class="cols"
        *sflFeature="'admin.dashboardFeed'"
      >
        <section style="flex: 3 1 360px">
          <h2>Comments to review · 5</h2>
          <!-- DUMMY (admin.dashboardFeed): comments (S10.22) -->
          <ul class="cards">
            @for (c of comments; track c.author + c.when) {
              <li>
                <div class="k-row k-between k-small k-muted">
                  <span>
                    <strong style="color: var(--sfl-text)">
                      {{ c.author }}
                    </strong>
                    on
                    <a
                      class="k-link"
                      routerLink="/games"
                    >
                      Game {{ c.game }}
                    </a>
                  </span>
                  <span>{{ c.when }}</span>
                </div>
                <p style="margin: 0">{{ c.text }}</p>
                <div class="k-row">
                  <button
                    sflBtn
                    size="sm"
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    sflBtn
                    size="sm"
                    variant="ghost"
                    type="button"
                  >
                    Reject
                  </button>
                  <button
                    sflBtn
                    size="sm"
                    variant="danger"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            }
          </ul>
        </section>
        <section style="flex: 2 1 280px">
          <h2>Recent actions</h2>
          <ol class="box">
            @for (l of log; track l.when + l.text) {
              <li class="k-small">
                <span class="k-muted">{{ l.when }}</span>
                · {{ l.text }}
              </li>
            }
          </ol>
          <p class="k-hint">
            Every change of a status and every moderation decision is written
            here: who, what, when.
          </p>
        </section>
      </div>
    </div>
  `,
})
export class AdminDashboardPageComponent {
  private readonly games = inject(GamesStore);
  protected readonly season = new Date().getFullYear();
  protected readonly steps = ['New', 'Draft', 'Published'];
  private readonly next = nextSaturday(new Date());
  protected readonly nextLabel = format(this.next, 'EEE d MMM');

  protected readonly published = computed(() =>
    this.games.gamesEntities().filter(g => g.status === 'published'),
  );
  protected readonly toPublish = computed(() =>
    this.games
      .gamesEntities()
      .filter(g => g.status === 'draft' || g.status === 'new'),
  );
  protected readonly publishNote = computed(() => {
    const l = this.toPublish();
    const n = l.filter(g => g.status === 'new').length;
    return `${n} new, ${l.length - n} draft`;
  });

  protected readonly bars = computed(() =>
    this.published()
      .slice()
      .sort((a, b) => a.number - b.number)
      .slice(-14)
      .map(g => ({
        v: g.metadata?.totalGoals ?? 0,
        win: !g.metadata?.scoreIsDraw,
        label: String(g.number),
      })),
  );
  protected readonly trend = computed(() => {
    let sum = 0;
    const t = this.bars().map(b => (sum += b.v));
    return t.length > 1 ? t : [0, 0];
  });

  protected readonly todo = computed(() => {
    const rows = this.toPublish()
      .slice()
      .sort((a, b) => b.number - a.number)
      .map(g => {
        const score = `${g.metadata?.scoreFirstDraft ?? 0} : ${g.metadata?.scoreSecondDraft ?? 0}`;
        const isNew = g.status === 'new';
        return {
          key: g.id,
          number: g.number,
          teams: `BMW ${score} HONDA`,
          date: format(g.playedAt, 'EEE d MMM'),
          problem: isNew ? 'no squads yet' : 'ready to check and publish',
          step: isNew ? 0 : 1,
          secondary: isNew ? 'Open' : 'Check',
          secondaryLink: ['/games/edit', g.season, g.number],
          primary: isNew ? 'Start draft' : 'Publish',
          primaryLink: isNew ? '/admin/wizard' : '/admin/confirm',
        };
      });
    const nextNumber =
      Math.max(0, ...this.games.gamesEntities().map(g => g.number)) + 1;
    return [
      {
        key: 'next',
        number: nextNumber,
        teams: 'BMW — HONDA',
        date: format(this.next, 'EEE d MMM'),
        problem: 'no squads yet',
        step: 0,
        secondary: 'Open',
        secondaryLink: '/admin/wizard',
        primary: 'Start draft',
        primaryLink: '/admin/wizard',
      },
      ...rows,
    ];
  });

  protected readonly comments = [
    {
      author: 'Viper',
      game: 46,
      when: 'today, 10:12',
      text: 'Great game, the penalty at the end was fair.',
    },
    {
      author: 'Guest',
      game: 46,
      when: 'today, 09:40',
      text: 'Buy followers cheap: [link removed]',
    },
    {
      author: 'Pike',
      game: 45,
      when: 'yesterday',
      text: 'Rematch on Saturday?',
    },
  ];
  protected readonly log = [
    { when: 'today, 11:02', text: 'admin approved a comment on Game 46' },
    { when: 'today, 10:50', text: 'admin changed Game 46: New → Draft' },
    { when: 'yesterday', text: 'admin created Game 47' },
    { when: '14 Nov', text: 'admin published Game 44' },
  ];
}
