import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MediaDTO } from '@sfl/schemas';
import { mediaUrl } from '../lib/media-url';

/**
 * Photos of a game or a player: the picture, the caption under it. A photo
 * without a caption has the alt text "Photo"; nothing is shown for an empty list
 * except the text of `empty`.
 */
@Component({
  selector: 'sfl-photo-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    figure {
      margin: 0;
    }
    img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      border-radius: var(--sfl-radius);
      background: var(--sfl-surface-2);
    }
    figcaption {
      margin-top: 4px;
      color: var(--sfl-muted);
      font-size: var(--sfl-fs-sm);
    }
  `,
  template: `
    @if (photos().length) {
      <div class="k-grid-sm">
        @for (photo of photos(); track photo.id) {
          <figure>
            <img
              loading="lazy"
              decoding="async"
              [src]="url(photo.id)"
              [alt]="photo.caption || 'Photo'"
            />
            @if (photo.caption) {
              <figcaption>{{ photo.caption }}</figcaption>
            }
          </figure>
        }
      </div>
    } @else {
      <p class="k-muted">{{ empty() }}</p>
    }
  `,
})
export class PhotoGridComponent {
  readonly photos = input.required<readonly MediaDTO[]>();
  readonly empty = input('No photos yet.');

  protected readonly url = mediaUrl;
}
