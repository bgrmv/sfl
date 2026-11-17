import { ChangeDetectionStrategy, Component } from '@angular/core';
import packageJSON from 'package.json';
import { RELEASES } from '@shared/dummy';
import { KIT } from '@shared/ui/kit';

/** DUMMY (releases.page): the release feed is made up (S10.51). */
@Component({
  selector: 'sfl-releases-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'releases.page'"
    >
      <sfl-page-head
        title="Release notes"
        lead="What we finished and when. Newest first."
      >
        <button
          sflBtn
          variant="ghost"
          type="button"
        >
          RSS feed
        </button>
        <button
          sflBtn
          type="button"
        >
          Suggest a feature
        </button>
      </sfl-page-head>
      <sfl-card
        flag="releases.page"
        tone="score"
        title="Current"
      >
        <h2
          class="k-head"
          style="color:var(--sfl-accent)"
        >
          2026.11.3
        </h2>
        <span class="k-muted">15 Nov 2026</span>
        <b>Two scoring systems, side by side</b>
        <p>
          Pick the ancient or the positional system in the header and every
          rating follows. The old system stays the default.
        </p>
      </sfl-card>
      <sfl-card
        flag="releases.page"
        title="Older releases"
      >
        <ul class="k-list">
          @for (r of releases; track r.v) {
            <li>
              <b class="k-head">{{ r.v }}</b>
              <span class="k-muted k-small">{{ r.d }}</span>
              <span class="k-grow">{{ r.t }}</span>
              <sfl-badge>{{ r.n }} changes</sfl-badge>
            </li>
          }
        </ul>
      </sfl-card>
      <sfl-card
        flag="releases.page"
        title="What is next"
      >
        <p class="k-small k-muted">
          Order follows the priorities of the league: statistics first.
        </p>
        <ul class="k-small">
          <li>Personal account and graphs of a player</li>
          <li>Photo and video album</li>
          <li>Votes on the rules</li>
        </ul>
      </sfl-card>
    </div>
  `,
})
export class ReleasesPageComponent {
  protected readonly releases = RELEASES;
  /** LIVE: the version of this build; the notes below are DUMMY until S10.51. */
  protected readonly version = packageJSON.version;
}
