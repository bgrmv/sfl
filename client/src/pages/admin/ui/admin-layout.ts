import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { GameService, GamesStore } from '@entities/game';
import { AuthService } from '@shared/auth/auth.service';

/**
 * Admin shell of the design (boards Dashboard, AdminPlayers, ...): a sidebar with counters and
 * the content. The public header and footer are hidden on `/admin` (see AppComponent).
 * LIVE: the count of games to publish. DUMMY (`admin.sidebarCounts`): the other counters.
 */
@Component({
  selector: 'sfl-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  providers: [GameService, GamesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      min-height: 100vh;
    }
    aside {
      flex: 0 0 240px;
      flex-grow: 1;
      max-width: 100%;
      background: var(--sfl-surface);
      border-right: 1px solid var(--sfl-border);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      display: inline-flex;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
      border-radius: var(--sfl-radius);
      font: 700 18px var(--sfl-font-head);
    }
    .brand span:last-child {
      font: 600 16px var(--sfl-font-head);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 14px;
      font-weight: 600;
    }
    nav a {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 44px;
      padding: 0 12px;
      border-radius: var(--sfl-radius);
      color: var(--sfl-text);
    }
    nav a:hover {
      background: var(--sfl-surface-2);
      text-decoration: none;
    }
    nav a.active {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
    }
    .count {
      min-width: 22px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
    }
    a.active .count {
      background: var(--sfl-on-accent);
      color: var(--sfl-accent);
    }
    .foot {
      margin-top: auto;
      font-size: 13px;
      color: var(--sfl-muted);
    }
    .foot a {
      color: var(--sfl-link);
      font-weight: 700;
    }
    main {
      flex: 999 1 640px;
      min-width: 0;
    }
    @media (max-width: 760px) {
      aside {
        flex-basis: 100%;
        border-right: 0;
        border-bottom: 1px solid var(--sfl-border);
      }
      nav {
        flex-direction: row;
        flex-wrap: wrap;
      }
    }
  `,
  template: `
    <aside>
      <div class="brand">
        <span class="logo">SFL</span>
        <span>Admin</span>
      </div>
      <nav aria-label="Admin">
        @for (l of links(); track l.href) {
          <a
            [routerLink]="l.href"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: l.exact }"
            ariaCurrentWhenActive="page"
          >
            {{ l.label }}
            @if (l.count) {
              <span
                class="count"
                [attr.aria-label]="l.count + ' waiting'"
              >
                {{ l.count }}
              </span>
            }
          </a>
        }
      </nav>
      <div class="foot">
        Signed in as {{ user()?.email }}
        <br />
        <a routerLink="/home">Open public site</a>
      </div>
    </aside>
    <main class="k-compact"><router-outlet /></main>
  `,
})
export class AdminLayoutComponent {
  private readonly games = inject(GamesStore);
  protected readonly user = inject(AuthService).user;

  constructor() {
    effect(() =>
      this.games.initGamesStore({ season: new Date().getFullYear() }),
    );
  }

  private readonly toPublish = computed(
    () =>
      this.games
        .gamesEntities()
        .filter(g => g.status === 'draft' || g.status === 'new').length,
  );

  protected readonly links = computed(() => [
    { label: 'Overview', href: '/admin', count: 0, exact: true },
    { label: 'New game', href: '/admin/wizard', count: 0, exact: false },
    {
      label: 'Games',
      href: '/admin/confirm',
      count: this.toPublish(),
      exact: false,
    },
    // DUMMY (admin.sidebarCounts): the queue size comes from S10.40
    {
      label: 'Process games',
      href: '/admin/process',
      count: 586,
      exact: false,
    },
    { label: 'Players', href: '/admin/players', count: 0, exact: false },
    // DUMMY (admin.sidebarCounts): links without an account (S8.13)
    {
      label: 'Connect accounts',
      href: '/admin/connect',
      count: 15,
      exact: false,
    },
    { label: 'Schedule', href: '/admin/schedule', count: 0, exact: false },
    // DUMMY (admin.sidebarCounts): comments to review (S10.22)
    { label: 'Comments', href: '/admin/comments', count: 5, exact: false },
    { label: 'Photo and video', href: '/admin/media', count: 0, exact: false },
    { label: 'Releases', href: '/admin/releases', count: 1, exact: false },
  ]);
}
