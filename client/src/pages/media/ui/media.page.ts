import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KIT } from '@shared/ui/kit';

/** DUMMY (media.page): no storage yet (S10.19); the tiles are placeholders. */
@Component({
  selector: 'sfl-media-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'media.page'"
    >
      <sfl-page-head
        title="Photo and video"
        lead="128 photos and 12 videos from 46 games. Filter by player tags."
      >
        <button
          sflBtn
          variant="ghost"
          type="button"
        >
          Suggest a photo
        </button>
      </sfl-page-head>
      <sfl-card flag="media.page">
        <div class="k-row">
          <input
            class="k-input"
            style="max-width:360px"
            aria-label="Filter by tag"
            placeholder="Type a player, game or #idea"
          />
          @for (t of tags; track t) {
            <sfl-badge tone="accent">{{ t }} ×</sfl-badge>
          }
          <span class="k-grow"></span>
          <sfl-segmented
            label="View"
            [options]="['Grid', 'By game']"
            [value]="view()"
            (changed)="view.set($event)"
          />
        </div>
        <div class="k-grid-sm">
          @for (p of items; track $index) {
            <figure style="margin:0">
              <div
                role="img"
                [attr.aria-label]="p.kind + ' placeholder'"
                style="aspect-ratio:4/3;background:var(--sfl-surface-2);border-radius:4px;display:flex;align-items:flex-end;padding:6px"
              >
                @if (p.kind === 'Video') {
                  <sfl-badge tone="accent">▶ {{ p.dur }}</sfl-badge>
                }
              </div>
              <figcaption class="k-small k-muted">
                Game {{ p.game }} · {{ p.who }}
              </figcaption>
            </figure>
          }
        </div>
        <button
          sflBtn
          variant="ghost"
          type="button"
        >
          Show more
        </button>
      </sfl-card>
    </div>
  `,
})
export class MediaPageComponent {
  protected readonly view = signal('Grid');
  protected readonly tags = ['Falcon', 'Game 46'];
  protected readonly items = Array.from({ length: 12 }, (_, i) => ({
    kind: i % 5 === 4 ? 'Video' : 'Photo',
    dur: '0:24',
    game: 46 - (i % 4),
    who: ['Falcon', 'Lynx', 'Wolf'][i % 3],
  }));
}
