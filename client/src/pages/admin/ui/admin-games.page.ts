import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { Observable } from 'rxjs';
import { gameRuleViolations } from '@sfl/schemas';
import {
  EnumGameStatus,
  GameService,
  GamesStore,
  type IGameDTO,
} from '@entities/game';
import { toResult } from '@shared/api/to-result';
import { AuthService } from '@shared/auth/auth.service';
import { injectNotifier } from '@shared/store/inject-notifier';
import { KIT } from '@shared/ui/kit';

/** What the confirming person looks at: the rules of a published game (GLOSSARY, S3.13). */
function checklistOf(game: IGameDTO): { text: string; ok: boolean }[] {
  const violations = gameRuleViolations({
    status: EnumGameStatus.Published,
    teams: game.teams,
    statistics: game.statistics,
  });
  const broken = (rule: string) => violations.some(v => v.rule === rule);
  return [
    { text: 'Both teams are in the game', ok: game.teams.length === 2 },
    { text: 'Each team has exactly one captain', ok: !broken('captain') },
    {
      text: 'Every player has a position',
      ok: !broken('position') && !broken('team'),
    },
    { text: 'The game has players', ok: game.statistics.length > 0 },
    { text: 'An MVP is chosen', ok: game.statistics.some(s => s.isMVP) },
  ];
}

/**
 * Publication of the games (S10.35). LIVE (admin.confirm): the drafts and the
 * published games of the season, the confirmation of the person who is signed in,
 * taking it back, and the revoke with a reason. Two different people publish a draft.
 */
@Component({
  selector: 'sfl-admin-confirm-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.confirm'"
    >
      <sfl-page-head
        title="Publish games"
        lead="A game is published when two different admins or moderators confirm that it is filled in correctly. Until then it is a draft and counts in no rating."
      />
      @if (loading()) {
        <sfl-state kind="loading" />
      } @else if (!rows().length) {
        <sfl-state
          title="Nothing to publish"
          text="Drafts and published games of this season appear here."
        />
      }
      @for (g of rows(); track g.id) {
        <sfl-card
          flag="admin.confirm"
          [title]="'Game ' + g.number + ' · ' + g.date"
        >
          <div class="k-row k-between">
            <span>
              <b class="k-num">{{ g.score }}</b>
              <span class="k-muted k-small">
                · {{ g.confirmations }} of 2 confirmations
              </span>
            </span>
            <sfl-badge [tone]="g.published ? 'accent' : 'outline'">
              {{ g.published ? 'Published' : g.statusLabel }}
            </sfl-badge>
          </div>
          @if (!g.published) {
            <ul
              class="k-list"
              aria-label="Checklist before confirming"
            >
              @for (c of g.checklist; track c.text) {
                <li>
                  <span aria-hidden="true">{{ c.ok ? '✓' : '✗' }}</span>
                  <span
                    class="k-grow"
                    [class.k-muted]="c.ok"
                  >
                    {{ c.text }}
                  </span>
                  <span class="k-visually-hidden">
                    {{ c.ok ? 'done' : 'not done' }}
                  </span>
                </li>
              }
            </ul>
          }
          @if (g.revokedReason) {
            <p class="k-hint">Revoked: {{ g.revokedReason }}</p>
          }
          <div class="k-row">
            @if (!g.published && g.status === 'draft' && !g.mine) {
              <button
                sflBtn
                type="button"
                [disabled]="busy() || !g.ready"
                (click)="confirm(g.id)"
              >
                Confirm: the game is correct
              </button>
            }
            @if (g.mine) {
              <button
                sflBtn
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="unconfirm(g.id)"
              >
                Take my confirmation back
              </button>
            }
            @if (!g.published) {
              <a
                sflBtn
                variant="ghost"
                [routerLink]="['/games/edit', g.season, g.number]"
              >
                Edit
              </a>
            }
            @if (g.published && isAdmin()) {
              <button
                sflBtn
                variant="danger"
                type="button"
                (click)="revoking.set(revoking() === g.id ? null : g.id)"
              >
                Revoke publication
              </button>
            }
          </div>
          @if (revoking() === g.id) {
            <form
              class="k-col"
              (submit)="$event.preventDefault(); revoke(g.id)"
            >
              <p class="k-small">
                The game goes back to a draft and leaves every rating; the
                statistics of its players are recalculated. Photos and comments
                stay.
              </p>
              <div class="k-field">
                <label [attr.for]="'number-' + g.id">
                  Type the number of the game ({{ g.number }}) to confirm
                </label>
                <input
                  class="k-input"
                  inputmode="numeric"
                  [id]="'number-' + g.id"
                  [value]="typed()"
                  (input)="typed.set($any($event.target).value)"
                />
              </div>
              <div class="k-field">
                <label [attr.for]="'reason-' + g.id">Reason (required)</label>
                <textarea
                  class="k-textarea"
                  [id]="'reason-' + g.id"
                  maxlength="500"
                  [value]="reason()"
                  (input)="reason.set($any($event.target).value)"
                ></textarea>
              </div>
              <div class="k-row">
                <button
                  sflBtn
                  variant="danger"
                  type="submit"
                  [disabled]="
                    busy() ||
                    reason().trim().length < 3 ||
                    typed().trim() !== '' + g.number
                  "
                >
                  Revoke
                </button>
                <button
                  sflBtn
                  variant="ghost"
                  type="button"
                  (click)="revoking.set(null)"
                >
                  Keep it published
                </button>
              </div>
            </form>
          }
        </sfl-card>
      }
    </div>
  `,
})
export class AdminConfirmPageComponent {
  private readonly games = inject(GamesStore);
  private readonly service = inject(GameService);
  private readonly auth = inject(AuthService);
  private readonly notify = injectNotifier();

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly loading = this.games.loading;
  protected readonly busy = signal(false);
  protected readonly revoking = signal<string | null>(null);
  protected readonly reason = signal('');
  protected readonly typed = signal('');

  protected readonly rows = computed(() => {
    const me = this.auth.user()?.id;
    return this.games
      .gamesEntities()
      .filter(g => g.status === 'draft' || g.status === 'published')
      .slice()
      .sort((a, b) => b.number - a.number)
      .map(g => ({
        id: g.id,
        number: g.number,
        season: g.season,
        status: g.status,
        statusLabel: 'Draft',
        published: g.status === 'published',
        date: format(g.playedAt, 'EEE d MMM'),
        score: `${g.metadata?.scoreFirstDraft ?? 0} : ${g.metadata?.scoreSecondDraft ?? 0}`,
        confirmations: g.confirmations?.length ?? 0,
        mine: !!me && !!g.confirmations?.some(c => c.accountId === me),
        revokedReason: g.status === 'draft' ? g.revoked?.reason : undefined,
        checklist: checklistOf(g),
        ready: checklistOf(g).every(c => c.ok),
      }));
  });

  protected confirm(id: string) {
    this.run(this.service.confirm(id), 'Confirmed');
  }

  protected unconfirm(id: string) {
    this.run(this.service.unconfirm(id), 'Confirmation taken back');
  }

  protected revoke(id: string) {
    this.run(
      this.service.revoke(id, this.reason().trim()),
      'Publication revoked',
    );
    this.revoking.set(null);
    this.reason.set('');
    this.typed.set('');
  }

  private run(request: Observable<unknown>, done: string) {
    this.busy.set(true);
    request.pipe(toResult()).subscribe(result => {
      this.busy.set(false);
      result.match({
        ok: () => {
          this.notify.success(done);
          this.games.initGamesStore({ season: new Date().getFullYear() });
        },
        err: error => this.notify.error(error),
      });
    });
  }
}

/** DUMMY (admin.process): queue of old games with notes (S10.40). */
@Component({
  selector: 'sfl-admin-process-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.process'"
    >
      <sfl-page-head
        title="Process games"
        lead="Turn the notes of old games into filled games. Statistics have been kept since 2011."
      >
        <button
          sflBtn
          type="button"
        >
          Process the next one
        </button>
      </sfl-page-head>
      <div class="k-grid-sm">
        <sfl-stat
          label="Processed"
          value="412"
          sub="of 790"
        />
        <sfl-stat
          label="Waiting"
          value="378"
        />
        <sfl-stat
          label="Skipped weeks"
          value="9"
        />
      </div>
      <sfl-card
        flag="admin.process"
        title="Saturdays by year"
      >
        <sfl-bars
          [bars]="years"
          [height]="100"
          label="Processed Saturdays by year"
        />
        <p class="k-hint">1980–2010: no statistics kept.</p>
      </sfl-card>
      <sfl-card
        flag="admin.process"
        title="Queue"
      >
        <ul class="k-list">
          @for (g of queue; track g.no) {
            <li>
              <span class="k-muted k-small">{{ g.date }}</span>
              <b>Saturday {{ g.no }}</b>
              <span class="k-grow k-small k-muted">{{ g.note }}</span>
              <sfl-badge [tone]="g.st === 'Waiting' ? 'outline' : 'accent'">
                {{ g.st }}
              </sfl-badge>
              <button
                sflBtn
                size="sm"
                type="button"
              >
                Process
              </button>
            </li>
          }
        </ul>
      </sfl-card>
    </div>
  `,
})
export class AdminProcessPageComponent {
  protected readonly years = [
    2011, 2013, 2015, 2017, 2019, 2021, 2023, 2025,
  ].map((y, i) => ({
    v: 20 + i * 4,
    win: y > 2018,
    label: String(y).slice(2),
  }));
  protected readonly queue = [
    {
      date: '14 Nov 2015',
      no: 46,
      note: 'HONDA 5 : 5 BMW. Wolf equalised…',
      st: 'Waiting',
    },
    { date: '7 Nov 2015', no: 45, note: 'Rain, 8 players', st: 'Waiting' },
    { date: '31 Oct 2015', no: 44, note: 'Processed', st: 'Processed' },
  ];
}
