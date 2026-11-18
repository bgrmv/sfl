import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { BUILD_INFO } from '@shared/config/build-info';
import { buildLabel } from '@shared/lib/build-label';
import {
  filterByArea,
  RELEASE_AREAS,
  RELEASE_NOTES,
  ReleaseSeenService,
  type ReleaseArea,
} from '@shared/lib/release-notes';
import { KIT } from '@shared/ui/kit';

/**
 * LIVE: releases and the early history are built from docs/releases (S10.51, ADR 0022).
 * DUMMY (releases.next): the list “What is next” is made up.
 */
@Component({
  selector: 'sfl-releases-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="k-page">
      <sfl-page-head
        title="Release notes"
        lead="What we finished and when. Newest first."
      >
        <a
          sflBtn
          variant="ghost"
          href="/assets/releases.xml"
        >
          RSS feed
        </a>
      </sfl-page-head>

      <div
        class="k-row"
        role="group"
        aria-label="Filter by area"
      >
        <button
          sflBtn
          type="button"
          [variant]="area() === null ? 'primary' : 'ghost'"
          [attr.aria-pressed]="area() === null"
          (click)="area.set(null)"
        >
          All
        </button>
        @for (a of areas; track a) {
          <button
            sflBtn
            type="button"
            [variant]="area() === a ? 'primary' : 'ghost'"
            [attr.aria-pressed]="area() === a"
            (click)="area.set(a)"
          >
            {{ a }}
          </button>
        }
      </div>

      @if (releases().length === 0 && all.length === 0) {
        <sfl-card title="First release">
          <p>
            The first release is coming. Until then, see what has been done in
            the early history below.
          </p>
        </sfl-card>
      }

      @for (r of releases(); track r.version; let first = $first) {
        <sfl-card
          [tone]="first ? 'score' : 'default'"
          [title]="first ? 'Current release' : r.version"
        >
          <h2
            class="k-head"
            [style.color]="first ? 'var(--sfl-accent)' : null"
          >
            {{ r.version }}
          </h2>
          <span class="k-muted">{{ r.date }}</span>
          <b>{{ r.title }}</b>
          <ul class="k-list">
            @for (c of r.changes; track $index) {
              <li>
                <sfl-badge>{{ c.kind }}</sfl-badge>
                @if (c.area) {
                  <span class="k-muted k-small">{{ c.area }}</span>
                }
                <span class="k-grow">{{ c.text }}</span>
                @if (c.story) {
                  <span class="k-muted k-small">{{ c.story }}</span>
                }
              </li>
            }
          </ul>
        </sfl-card>
      }

      @if (early().length > 0) {
        <sfl-card title="Early history">
          <p class="k-small k-muted">What was done before the first release.</p>
          @for (s of early(); track s.date) {
            <h3 class="k-head">{{ s.title }}</h3>
            <span class="k-muted k-small">{{ s.date }}</span>
            @if (s.lead) {
              <p>{{ s.lead }}</p>
            }
            <ul class="k-list">
              @for (c of s.changes; track $index) {
                <li>
                  <sfl-badge>{{ c.kind }}</sfl-badge>
                  @if (c.area) {
                    <span class="k-muted k-small">{{ c.area }}</span>
                  }
                  <span class="k-grow">{{ c.text }}</span>
                  @if (c.story) {
                    <span class="k-muted k-small">{{ c.story }}</span>
                  }
                </li>
              }
            </ul>
          }
        </sfl-card>
      }

      <sfl-card title="This build">
        <p class="k-small">{{ thisBuild }}</p>
      </sfl-card>

      <sfl-card
        flag="releases.next"
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
  protected readonly areas = RELEASE_AREAS;
  protected readonly all = RELEASE_NOTES.releases;
  protected readonly area = signal<ReleaseArea | null>(null);
  protected readonly releases = computed(() =>
    filterByArea(RELEASE_NOTES.releases, this.area()),
  );
  protected readonly early = computed(() =>
    filterByArea(RELEASE_NOTES.early, this.area()),
  );
  protected readonly thisBuild = buildLabel(BUILD_INFO);

  constructor() {
    inject(ReleaseSeenService).markSeen();
  }
}
