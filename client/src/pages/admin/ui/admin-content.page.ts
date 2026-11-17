import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RELEASES } from '@shared/dummy';
import { KIT } from '@shared/ui/kit';

/** DUMMY (admin.releases): technical releases (S10.51). */
@Component({
  selector: 'sfl-admin-releases-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.releases'"
    >
      <sfl-page-head
        title="Releases"
        lead="Technical notes of every release: commits, pull requests, migrations. The short version for visitors is the public “Release notes”."
      >
        <a
          sflBtn
          variant="ghost"
          href="/releases"
        >
          Public page
        </a>
        <button
          sflBtn
          type="button"
          (click)="draft.set(!draft())"
        >
          Draft a new release
        </button>
      </sfl-page-head>
      @if (draft()) {
        <sfl-card
          flag="admin.releases"
          title="Draft a new release"
        >
          <div class="k-field">
            <label for="rt">Title</label>
            <input
              id="rt"
              class="k-input"
              value="Compare players and captains"
            />
          </div>
          <div class="k-field">
            <label for="rb">Release notes (Markdown)</label>
            <textarea
              id="rb"
              class="k-textarea"
            >
## What’s Changed&#10;- feat: compare two players (S10.7)</textarea>
          </div>
          <div class="k-row">
            <button
              sflBtn
              variant="ghost"
              type="button"
            >
              ✨ Generate release notes
            </button>
            <button
              sflBtn
              type="button"
            >
              Publish release
            </button>
            <button
              sflBtn
              variant="ghost"
              type="button"
            >
              Save draft
            </button>
          </div>
          <p class="k-hint">
            Publishing creates the tag on main and cannot be undone; a mistake
            is fixed by the next release.
          </p>
        </sfl-card>
      }
      @for (r of releases; track r.v; let i = $index) {
        <sfl-card
          flag="admin.releases"
          [title]="'v' + r.v"
        >
          <div class="k-row">
            <sfl-badge [tone]="i === 0 ? 'accent' : 'muted'">
              {{ i === 0 ? 'Latest' : 'Deployed' }}
            </sfl-badge>
            <span class="k-muted k-small">
              {{ r.d }} · {{ r.n }} commits · main · a3f9c21
            </span>
          </div>
          <b>{{ r.t }}</b>
          <ul class="k-small">
            <li>feat(client): compare two scoring systems (S10.45)</li>
            <li>fix(server): recalculation of a revoked game (S3.14)</li>
          </ul>
          <div class="k-row">
            <button
              sflBtn
              size="sm"
              variant="ghost"
              type="button"
            >
              Edit
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
        </sfl-card>
      }
    </div>
  `,
})
export class AdminReleasesPageComponent {
  protected readonly releases = RELEASES;
  protected readonly draft = signal(false);
}

/** DUMMY (admin.schedule): statuses of Saturdays, skipped weeks, transfers (S10.18). */
@Component({
  selector: 'sfl-admin-schedule-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.schedule'"
    >
      <sfl-page-head
        title="Schedule"
        lead="Every Saturday, since 1980. The game is played in any weather."
      />
      <sfl-card flag="admin.schedule">
        <ul class="k-list">
          @for (w of weeks; track w.date) {
            <li>
              <b>{{ w.date }}</b>
              <span class="k-grow k-muted k-small">{{ w.sub }}</span>
              <sfl-badge [tone]="w.st === 'Skipped' ? 'neg' : 'muted'">
                {{ w.st }}
              </sfl-badge>
              <button
                sflBtn
                size="sm"
                variant="ghost"
                type="button"
                (click)="skip.set(w.date)"
              >
                Mark as skipped
              </button>
            </li>
          }
        </ul>
      </sfl-card>
      @if (skip()) {
        <sfl-card
          flag="admin.schedule"
          [title]="'Mark ' + skip() + ' as skipped'"
        >
          <div class="k-field">
            <label for="sr">Reason (optional, public)</label>
            <input
              id="sr"
              class="k-input"
              value="Pitch is closed"
            />
          </div>
          <p class="k-hint">
            The week is marked “Skipped” in the feed. No line-ups, no
            statistics, no effect on any rating.
          </p>
          <div class="k-row">
            <button
              sflBtn
              type="button"
            >
              Mark as skipped
            </button>
            <button
              sflBtn
              variant="ghost"
              type="button"
              (click)="skip.set('')"
            >
              Cancel
            </button>
          </div>
        </sfl-card>
      }
      <sfl-card
        flag="admin.schedule"
        title="Transfers in game 46"
      >
        <p class="k-small k-muted">
          A transfer played for both teams. His goals and passes count for the
          team where they were made; win and loss are not counted.
        </p>
        <div class="k-row">
          <sfl-avatar text="RA" />
          <b>Raven</b>
          <span class="k-muted k-small k-grow">
            BMW, then HONDA from the 2nd half
          </span>
          <sfl-badge>Transfer</sfl-badge>
        </div>
        <button
          sflBtn
          variant="ghost"
          size="sm"
          type="button"
        >
          + Add transfer
        </button>
      </sfl-card>
    </div>
  `,
})
export class AdminSchedulePageComponent {
  protected readonly skip = signal('');
  protected readonly weeks = [
    { date: '21 Nov', sub: 'Game 47', st: 'Draft' },
    { date: '28 Nov', sub: 'Planned', st: 'Planned' },
    { date: '5 Dec', sub: 'Planned', st: 'Planned' },
    { date: '10 Oct', sub: 'Pitch is closed', st: 'Skipped' },
  ];
}
