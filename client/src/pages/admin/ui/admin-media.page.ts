import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { GameService, GamesStore } from '@entities/game';
import { MediaService, mediaUrl } from '@entities/media';
import { PlayersService, PlayersStore } from '@entities/player';
import { MEDIA_MAX_BYTES, MEDIA_MIME_TYPES, type MediaDTO } from '@sfl/schemas';
import { apiErrorMessage } from '@shared/api/api-error-message';
import { toResult } from '@shared/api/to-result';
import { injectNotifier } from '@shared/store/inject-notifier';
import { KIT } from '@shared/ui/kit';

/**
 * Photos of the league (S10.19). LIVE (admin.media): upload, caption, link to a game
 * and a player, delete. Video and tagging many photos at once are not done.
 */
@Component({
  selector: 'sfl-admin-media-page',
  imports: [...KIT],
  providers: [
    MediaService,
    GameService,
    GamesStore,
    PlayersService,
    PlayersStore,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.media'"
    >
      <sfl-page-head
        title="Photos"
        lead="Upload a photo, give it a caption and link it to a game or a player. The public pages show it at once."
      />
      <sfl-card
        flag="admin.media"
        title="Add a photo"
      >
        <form
          class="k-col"
          style="gap: 16px"
          (submit)="$event.preventDefault(); upload()"
        >
          <div class="k-field">
            <label for="media-file">File</label>
            <input
              id="media-file"
              class="k-input"
              type="file"
              [accept]="accept"
              (change)="pick($event)"
            />
            <span class="k-hint">
              JPG, PNG or WebP, up to {{ maxMb }} MB. Photos can show people:
              publish only what the league agreed to.
            </span>
          </div>
          <div class="k-field">
            <label for="media-caption">Caption</label>
            <input
              id="media-caption"
              class="k-input"
              type="text"
              maxlength="200"
              [value]="caption()"
              (input)="caption.set($any($event.target).value)"
            />
          </div>
          <div class="k-row">
            <div class="k-field k-grow">
              <label for="media-game">Game</label>
              <select
                id="media-game"
                class="k-select"
                (change)="gameId.set($any($event.target).value)"
              >
                <option value="">No game</option>
                @for (g of games(); track g.id) {
                  <option [value]="g.id">
                    Game {{ g.number }} · {{ g.season }}
                  </option>
                }
              </select>
            </div>
            <div class="k-field k-grow">
              <label for="media-player">Player</label>
              <select
                id="media-player"
                class="k-select"
                (change)="playerId.set($any($event.target).value)"
              >
                <option value="">No player</option>
                @for (p of players(); track p.id) {
                  <option [value]="p.id">{{ p.nickname }}</option>
                }
              </select>
            </div>
          </div>
          @if (error(); as message) {
            <p
              class="k-hint"
              role="alert"
            >
              {{ message }}
            </p>
          }
          <div class="k-row">
            <button
              sflBtn
              type="submit"
              [disabled]="!file() || uploading()"
            >
              {{ uploading() ? 'Uploading…' : 'Upload' }}
            </button>
          </div>
        </form>
      </sfl-card>

      <sfl-card
        flag="admin.media"
        [title]="'All photos · ' + photos().length"
      >
        @if (loading()) {
          <sfl-state kind="loading" />
        } @else if (!photos().length) {
          <sfl-state
            title="No photos yet"
            text="Upload the first photo with the form above."
          />
        } @else {
          <ul class="k-list">
            @for (photo of photos(); track photo.id) {
              <li>
                <img
                  class="thumb"
                  loading="lazy"
                  [src]="url(photo.id)"
                  [alt]="photo.caption || 'Photo'"
                />
                <span class="k-grow">
                  <input
                    class="k-input"
                    type="text"
                    maxlength="200"
                    [attr.aria-label]="'Caption of the photo ' + photo.id"
                    [value]="photo.caption"
                    (change)="rename(photo, $any($event.target).value)"
                  />
                  <span class="k-muted k-small">
                    {{ links(photo) }}
                  </span>
                </span>
                @if (confirming() === photo.id) {
                  <button
                    sflBtn
                    type="button"
                    (click)="remove(photo)"
                  >
                    Delete for good
                  </button>
                  <button
                    sflBtn
                    variant="ghost"
                    type="button"
                    (click)="confirming.set(null)"
                  >
                    Keep
                  </button>
                } @else {
                  <button
                    sflBtn
                    variant="ghost"
                    type="button"
                    (click)="confirming.set(photo.id)"
                  >
                    Delete
                  </button>
                }
              </li>
            }
          </ul>
        }
      </sfl-card>
    </div>
  `,
  styles: `
    .thumb {
      width: 96px;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      border-radius: var(--sfl-radius);
      background: var(--sfl-surface-2);
    }
  `,
})
export class AdminMediaPageComponent {
  private readonly media = inject(MediaService);
  private readonly gamesStore = inject(GamesStore);
  private readonly playersStore = inject(PlayersStore);
  private readonly notify = injectNotifier();

  protected readonly accept = MEDIA_MIME_TYPES.join(',');
  protected readonly maxMb = MEDIA_MAX_BYTES / 1024 / 1024;
  protected readonly url = mediaUrl;

  protected readonly photos = signal<MediaDTO[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly confirming = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly file = signal<File | null>(null);
  protected readonly caption = signal('');
  protected readonly gameId = signal('');
  protected readonly playerId = signal('');

  protected readonly games = computed(() =>
    this.gamesStore.gamesEntities().filter(g => g.status !== 'furture'),
  );
  protected readonly players = this.playersStore.playersEntities;

  constructor() {
    this.gamesStore.initGamesStore({ season: new Date().getFullYear() });
    this.media
      .find()
      .pipe(toResult())
      .subscribe(result => {
        this.loading.set(false);
        result.match({
          ok: photos => this.photos.set(photos),
          err: error => this.notify.error(error),
        });
      });
  }

  protected pick(event: Event) {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.error.set(null);
  }

  protected links(photo: MediaDTO): string {
    const game = this.gamesStore
      .gamesEntities()
      .find(g => g.id === photo.gameId);
    const player = this.playersStore
      .playersEntities()
      .find(p => p.id === photo.playerId);
    return (
      [
        game ? `Game ${game.number} · ${game.season}` : null,
        player ? player.nickname : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'No links'
    );
  }

  protected upload() {
    const file = this.file();
    if (!file || this.uploading()) return;
    if (file.size > MEDIA_MAX_BYTES) {
      this.error.set(`The photo is over ${this.maxMb} MB.`);
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.media
      .upload(file, {
        caption: this.caption(),
        gameId: this.gameId() || undefined,
        playerId: this.playerId() || undefined,
      })
      .pipe(toResult())
      .subscribe(result => {
        this.uploading.set(false);
        result.match({
          ok: photo => {
            this.photos.update(list => [photo, ...list]);
            this.file.set(null);
            this.caption.set('');
            this.notify.success('Photo added');
          },
          err: error => this.error.set(apiErrorMessage(error)),
        });
      });
  }

  protected rename(photo: MediaDTO, caption: string) {
    if (caption === photo.caption) return;
    this.media
      .update(photo.id, { caption })
      .pipe(toResult())
      .subscribe(result =>
        result.match({
          ok: updated => {
            this.photos.update(list =>
              list.map(p => (p.id === updated.id ? updated : p)),
            );
            this.notify.success('Caption saved');
          },
          err: error => this.notify.error(error),
        }),
      );
  }

  protected remove(photo: MediaDTO) {
    this.media
      .delete(photo.id)
      .pipe(toResult())
      .subscribe(result =>
        result.match({
          ok: () => {
            this.photos.update(list => list.filter(p => p.id !== photo.id));
            this.confirming.set(null);
            this.notify.success('Photo deleted');
          },
          err: error => this.notify.error(error),
        }),
      );
  }
}
