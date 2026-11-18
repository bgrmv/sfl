import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { PlayersService } from '@entities/player';
import type { InvitationDTO, InvitationListItem } from '@sfl/schemas';
import { apiErrorMessage } from '@shared/api/api-error-message';
import { toResult } from '@shared/api/to-result';
import { KIT } from '@shared/ui/kit';
import { InvitationsService } from '../api/invitations.service';

const FILTERS = ['All', 'Active', 'Used', 'Expired', 'Revoked'] as const;
const MAX_MATCHES = 8;
type Filter = (typeof FILTERS)[number];

interface PlayerOption {
  id: string;
  nickname: string;
  name: string;
  surname: string;
  /** "Nick, Name Surname": how the admin picks a person. */
  label: string;
}

/**
 * Connect accounts (S8.13, S10.48): the admin picks a player and makes a one-day
 * link; the player opens it, signs in with Google and the account is tied to him.
 * The site sends no e-mails: the link is copied and given in person, and shown once.
 * Not done yet (S10.48): login and password, QR, "Reset access", bulk links.
 */
@Component({
  selector: 'sfl-admin-connect-page',
  imports: [...KIT],
  providers: [PlayersService, InvitationsService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.connect'"
    >
      <sfl-page-head
        title="Connect accounts"
        lead="Send a player a one-day link: he signs in with Google and the account is tied to his player."
      />
      <div class="k-grid-sm">
        <sfl-stat
          label="Linked"
          [value]="'' + linkedCount()"
        />
        <sfl-stat
          label="Active links"
          [value]="'' + activeCount()"
        />
        <sfl-stat
          label="Without account"
          [value]="'' + candidates().length"
        />
      </div>

      <sfl-card
        flag="admin.connect"
        title="Create a link"
      >
        <div class="k-field">
          <label for="player">Player</label>
          @if (chosen(); as player) {
            <div class="k-row">
              <sfl-badge tone="accent">{{ player.label }}</sfl-badge>
              <button
                sflBtn
                size="sm"
                variant="ghost"
                type="button"
                (click)="selected.set('')"
              >
                Change
              </button>
            </div>
          } @else {
            <input
              id="player"
              class="k-input"
              type="search"
              autocomplete="off"
              placeholder="Type a nickname, name or surname"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
            <ul
              class="k-list matches"
              role="listbox"
              aria-label="Players without an account"
            >
              @for (p of matches(); track p.id) {
                <li
                  role="option"
                  [attr.aria-selected]="false"
                >
                  <button
                    sflBtn
                    variant="ghost"
                    type="button"
                    (click)="pick(p)"
                  >
                    {{ p.label }}
                  </button>
                </li>
              } @empty {
                <li class="k-muted k-small">No player matches.</li>
              }
            </ul>
            @if (hidden() > 0) {
              <span class="k-hint">
                {{ hidden() }} more: keep typing to narrow the list.
              </span>
            }
          }
          <span class="k-hint">
            Only players without a Google account. The link is valid for 1 day
            and works once.
          </span>
        </div>
        @if (error()) {
          <p
            class="k-callout"
            role="alert"
          >
            {{ error() }}
          </p>
        }
        <div class="k-row">
          <button
            sflBtn
            type="button"
            [disabled]="!selected() || creating()"
            (click)="create()"
          >
            Generate link
          </button>
        </div>
      </sfl-card>

      @if (fresh(); as link) {
        <sfl-card
          flag="admin.connect"
          title="Link is ready"
        >
          <b
            class="k-head left"
            [class.over]="!left()"
          >
            {{ left() || 'Expired' }}
          </b>
          <code class="k-callout url">{{ link.url }}</code>
          <div class="k-row">
            <button
              sflBtn
              size="sm"
              type="button"
              (click)="copy(link.url, 'Link copied')"
            >
              Copy link
            </button>
            <button
              sflBtn
              size="sm"
              variant="ghost"
              type="button"
              (click)="copy(message(link), 'Message copied')"
            >
              Copy message
            </button>
          </div>
          @if (copied()) {
            <span
              class="k-small"
              role="status"
            >
              {{ copied() }}
            </span>
          }
          <p class="k-hint">
            The site never sends e-mails: give the link in person or in a
            messenger. It is shown once; if you lose it, revoke it and make a
            new one.
          </p>
        </sfl-card>
      }

      <sfl-card
        flag="admin.connect"
        title="Links"
      >
        <sfl-segmented
          label="Filter links"
          [options]="filters"
          [value]="filter()"
          (changed)="filter.set($any($event))"
        />
        @if (loading()) {
          <sfl-state kind="loading" />
        } @else if (!shown().length) {
          <sfl-state
            title="No links"
            text="Links you make appear here."
          />
        } @else {
          <table class="k-table">
            <caption class="k-visually-hidden">
              Links to connect accounts to players
            </caption>
            <thead>
              <tr>
                <th>Player</th>
                <th>Created</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (i of shown(); track i.id) {
                <tr>
                  <td>{{ i.player.nickname }}</td>
                  <td>{{ day(i.createdAt) }}</td>
                  <td>
                    <sfl-badge [tone]="tone(i)">{{ statusText(i) }}</sfl-badge>
                  </td>
                  <td>
                    @if (i.status === 'active') {
                      <button
                        sflBtn
                        size="sm"
                        variant="danger"
                        type="button"
                        (click)="revoke(i)"
                      >
                        Revoke
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </sfl-card>
    </div>
  `,
  styles: `
    .left {
      font-size: 28px;
      color: var(--sfl-accent);
    }
    .left.over {
      color: var(--sfl-muted);
    }
    .matches {
      max-height: 260px;
      overflow-y: auto;
    }
    .url {
      overflow-wrap: anywhere;
    }
  `,
})
export class AdminConnectPageComponent {
  private readonly invitations = inject(InvitationsService);
  private readonly players = inject(PlayersService);

  protected readonly filters = FILTERS;
  protected readonly filter = signal<Filter>('All');
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly error = signal('');
  protected readonly copied = signal('');
  protected readonly selected = signal('');
  protected readonly query = signal('');
  protected readonly fresh = signal<InvitationDTO | null>(null);

  private readonly items = signal<InvitationListItem[]>([]);
  private readonly linkedIds = signal<ReadonlySet<string>>(new Set());
  private readonly everyone = signal<PlayerOption[]>([]);
  private readonly now = signal(Date.now());

  protected readonly candidates = computed(() =>
    this.everyone().filter(p => !this.linkedIds().has(p.id)),
  );
  protected readonly chosen = computed(
    () => this.candidates().find(p => p.id === this.selected()) ?? null,
  );
  private readonly found = computed(() => {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    return this.candidates().filter(p =>
      words.every(w => p.label.toLowerCase().includes(w)),
    );
  });
  protected readonly matches = computed(() =>
    this.found().slice(0, MAX_MATCHES),
  );
  protected readonly hidden = computed(
    () => this.found().length - this.matches().length,
  );
  protected readonly linkedCount = computed(() => this.linkedIds().size);
  protected readonly activeCount = computed(
    () => this.items().filter(i => i.status === 'active').length,
  );
  protected readonly shown = computed(() => {
    const filter = this.filter();
    return this.items().filter(
      i => filter === 'All' || i.status === filter.toLowerCase(),
    );
  });

  /** Time left of the fresh link, `hh:mm:ss`; empty when it is over. */
  protected readonly left = computed(() => {
    const link = this.fresh();
    if (!link) return '';
    const seconds = Math.floor(
      (new Date(link.expiresAt).getTime() - this.now()) / 1000,
    );
    if (seconds <= 0) return '';
    const part = (n: number) => String(n).padStart(2, '0');
    return `${part(Math.floor(seconds / 3600))}:${part(Math.floor((seconds % 3600) / 60))}:${part(seconds % 60)}`;
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    this.players.find().subscribe(list =>
      this.everyone.set(
        list
          .map(p => {
            const user = (p as { user?: { name?: string; surname?: string } })
              .user;
            const name = user?.name ?? '';
            const surname = user?.surname ?? '';
            const full = [name, surname].filter(Boolean).join(' ');
            return {
              id: p.id,
              nickname: p.nickname,
              name,
              surname,
              label: full ? `${p.nickname}, ${full}` : p.nickname,
            };
          })
          .sort((a, b) => a.nickname.localeCompare(b.nickname)),
      ),
    );
    this.reload();
  }

  private reload() {
    this.invitations
      .list()
      .pipe(toResult())
      .subscribe(result => {
        this.loading.set(false);
        if (!result.ok) {
          this.error.set(apiErrorMessage(result.error));
          return;
        }
        this.items.set(result.value.items);
        this.linkedIds.set(new Set(result.value.linkedPlayerIds));
      });
  }

  protected pick(player: PlayerOption) {
    this.selected.set(player.id);
    this.query.set('');
  }

  protected create() {
    const id = this.selected();
    if (!id || this.creating()) return;
    this.creating.set(true);
    this.error.set('');
    this.invitations
      .create(id)
      .pipe(toResult())
      .subscribe(result => {
        this.creating.set(false);
        if (!result.ok) {
          this.error.set(apiErrorMessage(result.error));
          return;
        }
        this.fresh.set(result.value);
        this.copied.set('');
        this.selected.set('');
        this.reload();
      });
  }

  protected revoke(item: InvitationListItem) {
    this.invitations
      .revoke(item.id)
      .pipe(toResult())
      .subscribe(result => {
        if (!result.ok) {
          this.error.set(apiErrorMessage(result.error));
          return;
        }
        if (this.fresh()?.id === item.id) this.fresh.set(null);
        this.reload();
      });
  }

  protected message(link: InvitationDTO): string {
    return `Hi! Open this link within 24 hours and sign in with Google to connect your account to your player on the league site. The link works once: ${link.url}`;
  }

  protected async copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(done);
    } catch {
      this.copied.set('Copy failed: select the text and copy it by hand');
    }
  }

  protected day(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected statusText(item: InvitationListItem): string {
    return item.status.charAt(0).toUpperCase() + item.status.slice(1);
  }

  protected tone(item: InvitationListItem) {
    return item.status === 'active'
      ? 'accent'
      : item.status === 'revoked'
        ? 'neg'
        : 'default';
  }
}
