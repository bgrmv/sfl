import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KIT } from '@shared/ui/kit';

/** DUMMY (admin.confirm): two confirmations and revoke; no endpoint is called. */
@Component({
  selector: 'sfl-admin-confirm-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.confirm'"
    >
      <sfl-page-head
        title="Game 47 · 21 Nov 2026"
        lead="BMW 6 : 4 HONDA · captains Falcon and Wolf · filled by Anna"
      >
        <sfl-badge [tone]="have() === 2 ? 'accent' : 'outline'">
          {{ have() === 2 ? 'Published' : 'Draft' }}
        </sfl-badge>
      </sfl-page-head>
      <sfl-card
        flag="admin.confirm"
        title="Confirmations · {{ have() }} of 2"
      >
        <p class="k-small k-muted">
          The game is published when two different admins or moderators confirm
          that it is filled in correctly. Until then it is a draft and counts in
          no rating.
        </p>
        <ul class="k-list">
          <li>
            <sfl-avatar text="AN" />
            <span class="k-grow">
              Anna
              <div class="k-muted k-small">Filled the game</div>
            </span>
            <sfl-badge tone="accent">Confirmed</sfl-badge>
          </li>
          <li>
            <sfl-avatar text="TO" />
            <span class="k-grow">Tom</span>
            @if (have() === 2) {
              <sfl-badge tone="accent">Confirmed</sfl-badge>
            } @else {
              <sfl-badge>Waiting</sfl-badge>
            }
          </li>
        </ul>
        <div class="k-row">
          @if (have() === 1) {
            <button
              sflBtn
              type="button"
              (click)="have.set(2)"
            >
              Confirm: the game is correct
            </button>
          } @else {
            <button
              sflBtn
              variant="ghost"
              type="button"
              (click)="have.set(1)"
            >
              Withdraw my confirmation
            </button>
          }
        </div>
      </sfl-card>
      <sfl-card
        flag="admin.confirm"
        title="History"
      >
        <ul class="k-list">
          <li>
            <span class="k-muted k-small">21 Nov 20:10</span>
            Anna filled the game
          </li>
          <li>
            <span class="k-muted k-small">21 Nov 20:12</span>
            Anna confirmed
          </li>
        </ul>
      </sfl-card>
      <section
        class="k-danger"
        aria-labelledby="dz"
      >
        <h2 id="dz">Danger zone</h2>
        <p class="k-small k-muted">
          Revoking takes the game out of every rating and recalculates the
          statistics. It returns to draft; the confirmations are cleared. A
          reason is required and is saved in the log.
        </p>
        @if (!revoking()) {
          <button
            sflBtn
            variant="danger"
            type="button"
            (click)="revoking.set(true)"
          >
            Revoke publication…
          </button>
        } @else {
          <div
            class="k-col"
            role="alertdialog"
            aria-labelledby="rv"
          >
            <h3 id="rv">Revoke game 47?</h3>
            <ul class="k-small">
              <li>
                The game leaves both ratings. Points of 21 players are
                recalculated.
              </li>
              <li>The comments and photos stay.</li>
            </ul>
            <div class="k-field">
              <label for="rr">Reason (required)</label>
              <textarea
                id="rr"
                class="k-textarea"
              ></textarea>
            </div>
            <div class="k-field">
              <label for="rn">Type the number of the game to confirm</label>
              <input
                id="rn"
                class="k-input"
              />
            </div>
            <div class="k-row">
              <button
                sflBtn
                variant="danger"
                type="button"
              >
                Revoke publication
              </button>
              <button
                sflBtn
                variant="ghost"
                type="button"
                (click)="revoking.set(false)"
              >
                Keep it published
              </button>
            </div>
          </div>
        }
      </section>
    </div>
  `,
})
export class AdminConfirmPageComponent {
  protected readonly have = signal(1);
  protected readonly revoking = signal(false);
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
