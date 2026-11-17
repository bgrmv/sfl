import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@shared/auth/auth.service';
import { RouterLink } from '@angular/router';
import { KIT } from '@shared/ui/kit';

/**
 * Profile. LIVE (profile.account): the signed-in user from AuthService. DUMMY (profile.page): the
 * account-player link, providers, preferences and data export are S8.13/S10.17; buttons do nothing yet.
 */
@Component({
  selector: 'sfl-profile-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'profile.page'"
      style="max-width:760px"
    >
      <sfl-page-head title="My profile" />
      @if (user(); as u) {
        <sfl-card
          *sflFeature="'profile.account'"
          flag="profile.account"
          title="Account"
        >
          <div class="k-row">
            <sfl-avatar [text]="u.email.slice(0, 2).toUpperCase()" />
            <b class="k-grow">{{ u.email }}</b>
            @for (r of u.roles; track r) {
              <sfl-badge>{{ r }}</sfl-badge>
            }
          </div>
        </sfl-card>
      } @else {
        <sfl-state
          title="You are not signed in"
          text="Sign in to see your profile."
        >
          <a
            sflBtn
            href="/sign-in"
          >
            Sign in
          </a>
        </sfl-state>
      }
      <sfl-card
        flag="profile.page"
        title="My player"
      >
        <div class="k-row">
          <sfl-avatar
            text="FA"
            [size]="56"
            [accent]="true"
          />
          <div class="k-grow">
            <b class="k-head">Falcon</b>
            <div class="k-muted k-small">№ 9 · Forward · Captain · 83 days</div>
          </div>
          <sfl-badge tone="accent">Linked</sfl-badge>
        </div>
        <div class="k-row">
          <a
            sflBtn
            routerLink="/players/falcon"
          >
            Open my page
          </a>
          <button
            sflBtn
            variant="ghost"
            type="button"
          >
            Unlink
          </button>
        </div>
      </sfl-card>
      <sfl-card
        flag="profile.page"
        title="Sign-in"
      >
        <ul class="k-list">
          <li>
            <sfl-avatar text="G" />
            <span class="k-grow">
              Google
              <div class="k-muted k-small">
                f***&#64;gmail.com · connected 3 Nov
              </div>
            </span>
            <button
              sflBtn
              variant="ghost"
              size="sm"
              type="button"
            >
              Disconnect
            </button>
          </li>
          <li>
            <sfl-avatar text="LY" />
            <span class="k-grow">
              Login and password
              <div class="k-muted k-small">
                Login: lynx7 · password set 3 Nov
              </div>
            </span>
            <button
              sflBtn
              variant="ghost"
              size="sm"
              type="button"
            >
              Change password
            </button>
          </li>
        </ul>
        <p class="k-hint">
          Only your own name and account id are kept. The address is hidden from
          other people.
        </p>
      </sfl-card>
      <sfl-card
        flag="profile.page"
        title="Preferences"
      >
        <div class="k-field">
          <span class="k-label">Language</span>
          <sfl-segmented
            label="Language"
            [options]="['English', 'Latvian', 'Russian']"
            value="English"
          />
          <span class="k-hint">
            Latvian and Russian are planned; the choice is saved now so it
            applies when they appear.
          </span>
        </div>
        <div class="k-field">
          <span class="k-label">Birthday</span>
          <div class="k-row">
            <input
              class="k-input"
              style="width:80px"
              aria-label="Day"
              value="19"
            />
            <select
              class="k-select"
              style="width:140px"
              aria-label="Month"
            >
              <option>November</option>
            </select>
            <input
              class="k-input"
              style="width:100px"
              aria-label="Year"
              value="1994"
            />
          </div>
          <sfl-segmented
            label="Show"
            [options]="['Show day and month', 'Show with age', 'Hide']"
            value="Hide"
          />
        </div>
        <button
          sflBtn
          type="button"
        >
          Save
        </button>
      </sfl-card>
      <sfl-card
        flag="profile.page"
        title="My data"
      >
        <p class="k-small k-muted">
          What is stored: name, account id, linked player, language and theme.
          Your games and statistics belong to the league history.
        </p>
        <div class="k-row">
          <button
            sflBtn
            variant="ghost"
            type="button"
          >
            Download my data (JSON)
          </button>
          <button
            sflBtn
            variant="danger"
            type="button"
          >
            Delete my account
          </button>
        </div>
      </sfl-card>
    </div>
  `,
})
export class ProfilePageComponent {
  protected readonly user = inject(AuthService).user;
}
