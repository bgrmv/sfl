import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { GameService, GamesStore } from '@entities/game';
import { MediaService, PhotoGridComponent } from '@entities/media';
import { PlayersService, PlayersStore } from '@entities/player';
import type { MediaDTO } from '@sfl/schemas';
import { toResult } from '@shared/api/to-result';
import { injectNotifier } from '@shared/store/inject-notifier';
import { KIT } from '@shared/ui/kit';

const PAGE = 24;

/**
 * Photos of the league (S10.23). LIVE (media.page): the newest first, "Show more",
 * a filter by player and by game of a season. Video and tags are not done.
 */
@Component({
  selector: 'sfl-media-page',
  imports: [PhotoGridComponent, ...KIT],
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
      *sflFeature="'media.page'"
    >
      <sfl-page-head
        title="Photos"
        lead="Photos of the games and the players, the newest first."
      />
      <sfl-card flag="media.page">
        <div class="k-row">
          <div class="k-field">
            <label for="media-season">Season</label>
            <select
              id="media-season"
              class="k-select"
              (change)="pickSeason($any($event.target).value)"
            >
              <option value="">All seasons</option>
              @for (y of seasons; track y) {
                <option [value]="y">{{ y }}</option>
              }
            </select>
          </div>
          <div class="k-field">
            <label for="media-game">Game</label>
            <select
              id="media-game"
              class="k-select"
              [disabled]="!season()"
              (change)="pickGame($any($event.target).value)"
            >
              <option value="">All games</option>
              @for (g of games(); track g.id) {
                <option [value]="g.id">Game {{ g.number }}</option>
              }
            </select>
          </div>
          <div class="k-field">
            <label for="media-player">Player</label>
            <select
              id="media-player"
              class="k-select"
              (change)="pickPlayer($any($event.target).value)"
            >
              <option value="">All players</option>
              @for (p of players(); track p.id) {
                <option [value]="p.id">{{ p.nickname }}</option>
              }
            </select>
          </div>
        </div>

        @if (loading() && !photos().length) {
          <sfl-state kind="loading" />
        } @else {
          <sfl-photo-grid
            [photos]="photos()"
            empty="No photos for this choice."
          />
        }

        @if (hasMore()) {
          <button
            sflBtn
            variant="ghost"
            type="button"
            [disabled]="loading()"
            (click)="more()"
          >
            {{ loading() ? 'Loading…' : 'Show more' }}
          </button>
        }
      </sfl-card>
    </div>
  `,
})
export class MediaPageComponent {
  private readonly media = inject(MediaService);
  private readonly gamesStore = inject(GamesStore);
  private readonly playersStore = inject(PlayersStore);
  private readonly notify = injectNotifier();

  private readonly thisYear = new Date().getFullYear();
  protected readonly seasons = Array.from(
    { length: 5 },
    (_, i) => this.thisYear - i,
  );

  protected readonly photos = signal<MediaDTO[]>([]);
  protected readonly loading = signal(false);
  protected readonly hasMore = signal(false);
  protected readonly season = signal<number | null>(null);
  protected readonly gameId = signal('');
  protected readonly playerId = signal('');

  protected readonly games = computed(() =>
    this.gamesStore.gamesEntities().filter(g => g.status !== 'furture'),
  );
  protected readonly players = this.playersStore.playersEntities;

  constructor() {
    this.load(true);
  }

  protected pickSeason(value: string) {
    this.gameId.set('');
    this.season.set(value ? Number(value) : null);
    if (value) this.gamesStore.initGamesStore({ season: Number(value) });
    this.load(true);
  }

  protected pickGame(value: string) {
    this.gameId.set(value);
    this.load(true);
  }

  protected pickPlayer(value: string) {
    this.playerId.set(value);
    this.load(true);
  }

  protected more() {
    this.load(false);
  }

  private load(reset: boolean) {
    this.loading.set(true);
    const offset = reset ? 0 : this.photos().length;
    this.media
      .find({
        ...(this.gameId() ? { gameId: this.gameId() } : {}),
        ...(this.playerId() ? { playerId: this.playerId() } : {}),
        limit: PAGE,
        offset,
      })
      .pipe(toResult())
      .subscribe(result => {
        this.loading.set(false);
        result.match({
          ok: page => {
            this.photos.update(list => (reset ? page : [...list, ...page]));
            this.hasMore.set(page.length === PAGE);
          },
          err: error => this.notify.error(error),
        });
      });
  }
}
