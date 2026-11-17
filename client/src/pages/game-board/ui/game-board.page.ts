import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { format } from 'date-fns';
import { GameService, GamesStore } from '@entities/game';
import { MediaService, PhotoGridComponent } from '@entities/media';
import {
  PlayerChipComponent,
  PlayersService,
  PlayersStore,
  initials,
} from '@entities/player';
import { AuthService } from '@shared/auth/auth.service';
import { LINEUP } from '@shared/dummy';
import { KIT } from '@shared/ui/kit';

/**
 * Game page of the design. LIVE: the score, captains, MVP, scorers, squads and the story
 * (GamesStore + PlayersStore). DUMMY: goal order, line-up map and comments
 * (`game.events`, `game.map`, `game.comments`); the photos are LIVE (MediaService).
 */
@Component({
  selector: 'sfl-game-board-page',
  imports: [PhotoGridComponent, PlayerChipComponent, RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    GameService,
    GamesStore,
    PlayersService,
    PlayersStore,
    MediaService,
  ],
  template: `
    <div class="k-page k-page--loose">
      <nav
        class="k-small k-muted"
        aria-label="Breadcrumb"
      >
        <a routerLink="/games">Games</a>
        / {{ season() }} / Game
        {{ number() }}
      </nav>

      @if (loading()) {
        <sfl-state kind="loading" />
      } @else if (!view()) {
        <sfl-state
          title="Game not found"
          text="This Saturday has no game yet."
        >
          <a
            sflBtn
            routerLink="/games"
          >
            All games
          </a>
        </sfl-state>
      } @else {
        @let v = view()!;
        <sfl-page-head
          [title]="'Game ' + number()"
          [lead]="v.date + ' · Season ' + season()"
        >
          <sfl-badge [tone]="v.published ? 'accent' : 'outline'">
            {{ v.published ? 'Published' : 'Draft' }}
          </sfl-badge>
          @if (isAdmin()) {
            <a
              sflBtn
              variant="ghost"
              [routerLink]="['/games/edit', season(), number()]"
            >
              Edit
            </a>
          }
        </sfl-page-head>

        <sfl-scoreboard
          *sflFeature="'game.scoreboard'"
          [aName]="v.a.name"
          [bName]="v.b.name"
          [a]="v.a.score"
          [b]="v.b.score"
          [aSub]="'1st draft · captain ' + v.a.captain"
          [bSub]="'2nd draft · captain ' + v.b.captain"
        />

        <div class="k-grid">
          <sfl-section
            *sflFeature="'game.mvp'"
            flag="game.mvp"
            [title]="'MVP · ' + v.mvp.length"
          >
            <ul class="k-list">
              @for (m of v.mvp; track m.id) {
                <li>
                  <sfl-player-chip
                    class="k-grow"
                    [playerId]="m.id"
                    [name]="m.name"
                    [size]="40"
                    [bold]="true"
                  />
                </li>
              } @empty {
                <li class="k-muted">No MVP in this game.</li>
              }
            </ul>
            <p class="k-hint">
              Three kinds: assigned by the organiser, leader by goals (a header
              counts double), leader by passes. A tie gives the award to every
              leader.
            </p>
          </sfl-section>

          <sfl-section
            *sflFeature="'game.events'"
            flag="game.events"
            title="Goals"
          >
            <ul class="k-list">
              @for (s of v.scorers; track s.id) {
                <li>
                  <sfl-badge>{{ s.team }}</sfl-badge>
                  <span class="k-grow">{{ s.name }}</span>
                  <span class="k-small k-muted">{{ s.text }}</span>
                </li>
              } @empty {
                <li class="k-muted">No goals recorded.</li>
              }
            </ul>
            <!-- DUMMY (game.events): the order of goals (S10.27) is not stored yet -->
            <p class="k-hint">
              The order of goals is not recorded for this game. Header ×2 ·
              Penalty +1 · Pass +1 for the passer · Own goal counts for the
              opponent, −1 for the author.
            </p>
          </sfl-section>
        </div>

        <sfl-section
          *sflFeature="'game.map'"
          flag="game.map"
          title="Line-up map"
        >
          <!-- DUMMY (game.map): positions on the pitch (x, y) are not stored (S10.38) -->
          <sfl-pitch [players]="lineup" />
          <p class="k-hint">
            The beach pitch in Jūrmala: the sea is on the north side, the dunes
            on the south side.
          </p>
        </sfl-section>

        <sfl-section
          *sflFeature="'game.squads'"
          flag="game.squads"
          title="Draft and squads"
        >
          <div class="k-grid">
            @for (s of v.squads; track s.title) {
              <div class="k-scroll">
                <h3>{{ s.title }}</h3>
                <table class="k-table">
                  <caption class="k-visually-hidden">
                    Squad {{ s.title }}
                  </caption>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Pos</th>
                      <th class="r">G+P</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of s.players; track p.id) {
                      <tr>
                        <td>
                          <a [routerLink]="['/players', p.id]">{{ p.name }}</a>
                          @if (p.captain) {
                            <sfl-badge tone="accent">C</sfl-badge>
                          }
                          @if (p.transfer) {
                            <sfl-badge>Transfer</sfl-badge>
                          }
                        </td>
                        <td>{{ p.pos }}</td>
                        <td class="r">{{ p.goals }}+{{ p.passes }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </sfl-section>

        @if (v.story) {
          <sfl-section
            *sflFeature="'game.story'"
            flag="game.story"
            title="Story of the game"
          >
            <p
              class="k-prose"
              style="white-space: pre-line"
            >
              {{ v.story }}
            </p>
          </sfl-section>
        }

        <sfl-section
          *sflFeature="'game.media'"
          flag="game.media"
          title="Photo"
        >
          <sfl-photo-grid
            [photos]="photos()"
            empty="No photos of this game yet."
          />
        </sfl-section>

        <sfl-section
          *sflFeature="'game.comments'"
          flag="game.comments"
          title="Comments · 2"
        >
          <!-- DUMMY (game.comments): comments are not implemented (S10.22) -->
          <ul class="k-list">
            <li>
              <div>
                <b>Viper</b>
                <span class="k-muted k-small">15 Nov, 10:12</span>
                <div>Great game, the penalty at the end was fair.</div>
              </div>
            </li>
            <li>
              <div>
                <b>Pike</b>
                <span class="k-muted k-small">15 Nov, 11:40</span>
                <div>Rematch on Saturday?</div>
              </div>
            </li>
          </ul>
          <form
            class="k-col"
            (submit)="$event.preventDefault()"
          >
            <div class="k-field">
              <label for="cn">Name</label>
              <input
                id="cn"
                class="k-input"
              />
            </div>
            <div class="k-field">
              <label for="ct">Comment</label>
              <textarea
                id="ct"
                class="k-textarea"
              ></textarea>
            </div>
            <button
              sflBtn
              type="submit"
            >
              Send for review
            </button>
            <span class="k-hint">
              Your comment appears after the administrator checks it.
            </span>
          </form>
        </sfl-section>
      }

      <div class="k-row k-between">
        @if (Number(number()) > 1) {
          <a
            class="k-link"
            [routerLink]="['/games/details', season(), Number(number()) - 1]"
          >
            ← Game {{ Number(number()) - 1 }}
          </a>
        } @else {
          <span></span>
        }
        <a
          class="k-link"
          [routerLink]="['/games/details', season(), Number(number()) + 1]"
        >
          Game {{ Number(number()) + 1 }} →
        </a>
      </div>
    </div>
  `,
})
export class GameBoardPageComponent {
  private readonly games = inject(GamesStore);
  private readonly players = inject(PlayersStore);
  readonly isAdmin = inject(AuthService).isAdmin;
  readonly season = input('');
  readonly number = input('');
  protected readonly Number = Number;
  protected readonly lineup = LINEUP;
  protected readonly loading = computed(
    () => this.games.loading() || this.players.loading(),
  );

  constructor() {
    effect(() => {
      const season = Number(this.season());
      if (season) {
        this.games.initGamesStore({ season });
      }
    });
  }

  private readonly mediaService = inject(MediaService);
  private readonly gameId = computed(
    () =>
      this.games
        .gamesEntities()
        .find(g => g.number === Number(this.number()) && g.status !== 'furture')
        ?.id,
  );
  /** The photos of the game; loaded again when another game is opened. */
  protected readonly photos = toSignal(
    toObservable(this.gameId).pipe(
      switchMap(gameId =>
        gameId ? this.mediaService.find({ gameId }) : of([]),
      ),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  protected readonly view = computed(() => {
    const game = this.games
      .gamesEntities()
      .find(g => g.number === Number(this.number()) && g.status !== 'furture');
    if (!game) {
      return null;
    }
    const names = new Map(
      this.players.playersEntities().map(p => [p.id, p.nickname]),
    );
    const nameOf = (id: string) => names.get(id) ?? 'Unknown';
    const meta = game.metadata ?? {};
    const teamName = (id: string | undefined) =>
      game.teams.find(t => t.id === id)?.name ?? '';
    const teamOfCaptain = (captainId: string) =>
      game.statistics.find(s => s.playerId === captainId)?.teamId;

    const squadOf = (teamId: string | undefined) =>
      game.statistics
        .filter(s => s.teamId === teamId)
        .map(s => ({
          id: s.playerId,
          name: nameOf(s.playerId),
          pos: s.position ?? '–',
          goals: s.goalsByLeg + s.goalsByHead + s.goalsByPenalty,
          passes: s.passes,
          captain: s.isCaptain,
          transfer: s.isTransfer,
        }));
    const aTeam = teamOfCaptain(meta.captainFirstDraft) ?? game.teams[0]?.id;
    const bTeam =
      teamOfCaptain(meta.captainSecondDraft) ??
      game.teams.find(t => t.id !== aTeam)?.id;

    const scorers = game.statistics
      .filter(
        s =>
          s.goalsByLeg + s.goalsByHead + s.goalsByPenalty + s.goalsByAuto > 0,
      )
      .map(s => ({
        id: s.playerId,
        name: nameOf(s.playerId),
        team: teamName(s.teamId),
        text: [
          s.goalsByLeg && `${s.goalsByLeg} goal`,
          s.goalsByHead && `${s.goalsByHead} header`,
          s.goalsByPenalty && `${s.goalsByPenalty} penalty`,
          s.goalsByAuto && `${s.goalsByAuto} own goal`,
        ]
          .filter(Boolean)
          .join(' · '),
      }));

    return {
      date: format(game.playedAt, 'EEEE, d MMMM yyyy'),
      published: game.status === 'published',
      a: {
        name: teamName(aTeam),
        score: meta.scoreFirstDraft ?? 0,
        captain: nameOf(meta.captainFirstDraft),
      },
      b: {
        name: teamName(bTeam),
        score: meta.scoreSecondDraft ?? 0,
        captain: nameOf(meta.captainSecondDraft),
      },
      mvp: ((meta.mvpListIds ?? []) as string[]).map(id => ({
        id,
        name: nameOf(id),
        ini: initials(nameOf(id)),
      })),
      scorers,
      squads: [
        { title: teamName(aTeam), players: squadOf(aTeam) },
        { title: teamName(bTeam), players: squadOf(bTeam) },
      ],
      story: game.description,
    };
  });
}
