import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  PlayersService,
  PlayersStore,
  type TPlayerFinal,
  PlayerChipComponent,
} from '@entities/player';
import { PlayerCreateButtonComponent } from '@features/player-create';
import { PlayerDeleteDialogComponent } from '@features/player-delete';
import { PlayerEditDialogComponent } from '@features/player-edit';
import { TableQuery } from '@shared/lib/table-query';
import { KIT } from '@shared/ui/kit';

/**
 * Players admin. LIVE (admin.players): the list, search, edit and delete through the existing
 * dialogs and PlayersStore. DUMMY: account status and archive (S10.32 replaces delete).
 */
@Component({
  selector: 'sfl-admin-players-page',
  imports: [PlayerChipComponent, PlayerCreateButtonComponent, ...KIT],
  providers: [PlayersService, PlayersStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.players'"
    >
      <sfl-page-head title="Players">
        <sfl-player-create-button />
      </sfl-page-head>
      <input
        class="k-input"
        style="max-width: 320px"
        aria-label="Search by name or number"
        placeholder="Search by name or number"
        [value]="q()"
        (input)="q.set($any($event.target).value)"
      />
      <sfl-card flag="admin.players">
        <sfl-filter-bar [query]="tq" />
        @if (loading()) {
          <sfl-state kind="loading" />
        } @else {
          <div class="k-scroll">
            <table class="k-table">
              <caption class="k-visually-hidden">Players of the league</caption>
              <thead>
                <tr>
                  <th
                    sflSortKey="nickname"
                    [query]="tq"
                  >
                    Player
                  </th>
                  <th
                    sflSortKey="captain"
                    [query]="tq"
                  >
                    Captain
                  </th>
                  <th
                    sflSortKey="account"
                    [query]="tq"
                  >
                    Account
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of rows(); track p.id) {
                  <tr>
                    <td>
                      <sfl-player-chip
                        [name]="p.nickname"
                        [number]="p.number"
                        [size]="28"
                      />
                    </td>
                    <td>{{ p.isCaptain ? '✓' : '' }}</td>
                    <td>{{ p.user?.id ? 'linked' : '—' }}</td>
                    <td class="k-row">
                      <button
                        sflBtn
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="edit(p)"
                      >
                        Edit
                      </button>
                      <button
                        sflBtn
                        size="sm"
                        variant="danger"
                        type="button"
                        (click)="remove(p)"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td
                      colspan="4"
                      class="k-muted"
                    >
                      No players match.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <!-- DUMMY (admin.players): "Archive" replaces delete in S10.32; the account column shows only whether a user is attached -->
        <p class="k-hint">
          Delete removes the player for good. The archive (hide from lists, keep
          the games) is not built yet.
        </p>
      </sfl-card>
    </div>
  `,
})
export class AdminPlayersPageComponent {
  private readonly store = inject(PlayersStore);
  private readonly dialog = inject(MatDialog);
  protected readonly loading = this.store.loading;
  protected readonly q = signal('');
  protected readonly tq = new TableQuery([
    { key: 'nickname', label: 'Player', type: 'text' },
    { key: 'num', label: 'Number', type: 'number' },
    { key: 'captain', label: 'Captain (yes/no)', type: 'text' },
    { key: 'account', label: 'Account (linked/none)', type: 'text' },
  ]);
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    const list = this.store
      .playersEntities()
      .map(p => ({
        ...p,
        captain: p.isCaptain ? 'yes' : 'no',
        account: p.user?.id ? 'linked' : 'none',
        num: p.number ?? null,
      }))
      .filter(
        p =>
          !q || p.nickname.toLowerCase().includes(q) || String(p.number) === q,
      );
    return this.tq.apply(list);
  });

  edit(player: TPlayerFinal) {
    this.dialog
      .open(PlayerEditDialogComponent, { data: player })
      .afterClosed()
      .subscribe(changes => {
        if (changes) {
          this.store.updateOne({ id: player.id, changes });
        }
      });
  }

  remove(player: TPlayerFinal) {
    this.dialog
      .open(PlayerDeleteDialogComponent, { data: { player } })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.store.deleteOne(player.id);
        }
      });
  }
}

/** DUMMY (admin.newPlayer): full profile and quick add; nothing is saved. */
@Component({
  selector: 'sfl-admin-new-player-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.newPlayer'"
      style="max-width:760px"
    >
      <sfl-page-head
        title="New player"
        lead="A newcomer or a player from the old notes. Only the name or the nickname is needed."
      />
      <sfl-segmented
        label="Mode"
        [options]="['Full profile', 'Quick add']"
        [value]="mode()"
        (changed)="mode.set($event)"
      />
      <sfl-card
        flag="admin.newPlayer"
        title="Who is this"
      >
        <div class="k-field">
          <label for="dn">Display name</label>
          <input
            id="dn"
            class="k-input"
            value="Kite"
          />
          <span class="k-hint">Shown on the site.</span>
        </div>
        @if (mode() === 'Full profile') {
          <div class="k-grid">
            <div class="k-field">
              <label for="nn">Nickname (optional)</label>
              <input
                id="nn"
                class="k-input"
              />
            </div>
            <div class="k-field">
              <label for="fn">Full name (optional)</label>
              <input
                id="fn"
                class="k-input"
                value="Pavel K."
              />
              <span class="k-hint">Admins only, never shown.</span>
            </div>
            <div class="k-field">
              <label for="no">Number (optional)</label>
              <input
                id="no"
                class="k-input"
                value="12"
              />
              <span class="k-hint">Free: 12, 14, 18, 22.</span>
            </div>
          </div>
          <label class="k-check">
            <input
              type="checkbox"
              checked
            />
            Newcomer: shown with a “New” badge for the first 5 games
          </label>
        }
      </sfl-card>
      @if (mode() === 'Full profile') {
        <sfl-card
          flag="admin.newPlayer"
          title="On the pitch"
        >
          <sfl-segmented
            label="Main position"
            [options]="['GK', 'DF', 'MF', 'FW', 'Not sure yet']"
            value="Not sure yet"
          />
          <label class="k-check">
            <input type="checkbox" />
            Can be a captain
          </label>
        </sfl-card>
        <sfl-card
          flag="admin.newPlayer"
          title="About"
        >
          <div class="k-field">
            <label for="bio">Short bio (optional)</label>
            <textarea
              id="bio"
              class="k-textarea"
              maxlength="280"
            ></textarea>
          </div>
          <label class="k-check">
            <input type="checkbox" />
            The player agreed to show the birthday, the photo and the links
          </label>
        </sfl-card>
      }
      <div class="k-row">
        <button
          sflBtn
          type="button"
        >
          Save player
        </button>
        <button
          sflBtn
          variant="ghost"
          type="button"
        >
          Save and create connect link
        </button>
      </div>
    </div>
  `,
})
export class AdminNewPlayerPageComponent {
  protected readonly mode = signal('Full profile');
}

/** DUMMY (admin.connect): one-day connect links (S8.13); nothing is generated. */
@Component({
  selector: 'sfl-admin-connect-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.connect'"
    >
      <sfl-page-head
        title="Connect accounts"
        lead="Send a player a one-day link: he signs in with Google and the account is tied to his player."
      >
        <button
          sflBtn
          variant="ghost"
          type="button"
        >
          Print QR sheet
        </button>
      </sfl-page-head>
      <div class="k-grid-sm">
        <sfl-stat
          label="Linked"
          value="23"
        />
        <sfl-stat
          label="Active links"
          value="3"
        />
        <sfl-stat
          label="Without account"
          value="15"
        />
      </div>
      <sfl-card
        flag="admin.connect"
        title="Create a link"
      >
        <div class="k-field">
          <label for="cp">Player</label>
          <select
            id="cp"
            class="k-select"
          >
            <option>Lynx · № 7 · Midfielder · no account yet</option>
          </select>
        </div>
        <label class="k-check">
          <input
            type="checkbox"
            checked
          />
          Google
        </label>
        <label class="k-check">
          <input
            type="checkbox"
            checked
          />
          Login and password
        </label>
        <p class="k-hint">Valid for 1 day · one use · cannot be extended.</p>
        <div class="k-field">
          <label for="cm">Message for the player (optional)</label>
          <textarea
            id="cm"
            class="k-textarea"
          >
Hi Lynx! Sign in once and you will see your own page and can vote.</textarea>
        </div>
        <div class="k-row">
          <button
            sflBtn
            type="button"
            (click)="ready.set(true)"
          >
            Generate link
          </button>
        </div>
      </sfl-card>
      @if (ready()) {
        <sfl-card
          flag="admin.connect"
          title="Link is ready"
        >
          <b
            class="k-head"
            style="font-size:28px;color:var(--sfl-accent)"
          >
            23:59:41
          </b>
          <code class="k-callout">
            https://sfl.example/connect/q7Hk-3xT9…mP2z
          </code>
          <div class="k-row">
            <button
              sflBtn
              size="sm"
              type="button"
            >
              Copy link
            </button>
            <button
              sflBtn
              size="sm"
              variant="ghost"
              type="button"
            >
              Copy message
            </button>
            <button
              sflBtn
              size="sm"
              variant="ghost"
              type="button"
            >
              Show QR
            </button>
          </div>
          <p class="k-hint">
            The site never sends e-mails: send the message yourself in a
            messenger or give the QR. The link is shown once.
          </p>
        </sfl-card>
      }
      <sfl-card
        flag="admin.connect"
        title="Links"
      >
        <table class="k-table">
          <caption class="k-visually-hidden">
            Accounts linked to players
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
            <tr>
              <td>Lynx · № 7</td>
              <td>Google, login</td>
              <td>today by Anna</td>
              <td><sfl-badge tone="accent">Active</sfl-badge></td>
              <td>
                <button
                  sflBtn
                  size="sm"
                  variant="danger"
                  type="button"
                >
                  Revoke
                </button>
              </td>
            </tr>
            <tr>
              <td>Hawk · № 11</td>
              <td>Google</td>
              <td>yesterday by Anna</td>
              <td><sfl-badge>Used</sfl-badge></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </sfl-card>
    </div>
  `,
})
export class AdminConnectPageComponent {
  protected readonly ready = signal(false);
}
