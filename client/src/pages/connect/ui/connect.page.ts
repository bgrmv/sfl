import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KIT } from '@shared/ui/kit';

/** DUMMY (connect.pages): landing, login, expired, done: one component with a step switch. Token check is S8.13. */
@Component({
  selector: 'sfl-connect-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'connect.pages'"
      style="max-width:520px"
    >
      <sfl-segmented
        label="Demo step (dummy)"
        [options]="steps"
        [value]="step()"
        (changed)="step.set($event)"
      />
      @switch (step()) {
        @case ('Landing') {
          <sfl-card
            flag="connect.pages"
            title="Link your account"
          >
            <div class="k-row">
              <sfl-avatar
                text="LY"
                [size]="56"
                [accent]="true"
              />
              <div>
                <span class="k-eyebrow">This is your player</span>
                <h2>Lynx</h2>
                <span class="k-muted k-small">№ 7 · Midfielder · 79 days</span>
              </div>
            </div>
            <button
              sflBtn
              type="button"
              (click)="step.set('Done')"
            >
              Continue with Google
            </button>
            <span class="k-muted k-small">
              or, if you have no Google account
            </span>
            <button
              sflBtn
              variant="ghost"
              type="button"
              (click)="step.set('Login')"
            >
              Create a login and password
            </button>
            <p class="k-hint">
              The link works for 23 h 41 min and only once. Not you? Do not sign
              in and tell the admin.
            </p>
          </sfl-card>
        }
        @case ('Login') {
          <sfl-card
            flag="connect.pages"
            title="Create a login"
          >
            <p class="k-small k-muted">
              For the player Lynx (№ 7). No e-mail is needed.
            </p>
            <div class="k-field">
              <label for="lg">Login</label>
              <input
                id="lg"
                class="k-input"
                value="lynx7"
              />
              <span class="k-hint">Letters, digits and _ . Free ✓</span>
            </div>
            <div class="k-field">
              <label for="pw">Password</label>
              <input
                id="pw"
                type="password"
                class="k-input"
                value="123456789012"
              />
              <span class="k-hint">
                Good. At least 10 characters; a phrase is better than a word.
              </span>
            </div>
            <div class="k-field">
              <label for="pw2">Repeat password</label>
              <input
                id="pw2"
                type="password"
                class="k-input"
                value="123456789012"
              />
            </div>
            <p class="k-callout">
              There is no e-mail to reset it. If you forget it, ask the admin
              for a new link.
            </p>
            <button
              sflBtn
              type="button"
              (click)="step.set('Done')"
            >
              Create login and connect
            </button>
          </sfl-card>
        }
        @case ('Expired') {
          <sfl-card
            flag="connect.pages"
            title="This link has expired"
          >
            <p>
              Links work for one day and only once. Ask the admin to send you a
              new one. Nothing was connected.
            </p>
            <a
              sflBtn
              routerLink="/home"
            >
              Go to the site
            </a>
          </sfl-card>
        }
        @default {
          <sfl-card
            flag="connect.pages"
            title="You are connected, Lynx"
          >
            <ul class="k-small">
              <li>Vote on the new rules and suggest your own.</li>
              <li>Add your birthday, photo and position in the profile.</li>
              <li>Get a reminder before the draft, if you are a captain.</li>
            </ul>
            <div class="k-row">
              <a
                sflBtn
                routerLink="/profile"
              >
                Open my profile
              </a>
              <a
                sflBtn
                variant="ghost"
                routerLink="/players/lynx"
              >
                My player page
              </a>
            </div>
          </sfl-card>
        }
      }
    </div>
  `,
})
export class ConnectPageComponent {
  protected readonly steps = ['Landing', 'Login', 'Expired', 'Done'];
  protected readonly step = signal('Landing');
}
