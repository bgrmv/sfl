import { InjectionToken, isDevMode } from '@angular/core';

/**
 * Feature flags of the "Табло" design blocks.
 *
 * `enabled: true`  - the block is rendered.
 * `dummy: true`    - the block shows DUMMY data (made up in `@shared/dummy`): the look is done,
 *                    the real data is not wired yet. `needs` says what has to be connected.
 * When a block gets a store/service, set `dummy: false` (and remove the dummy import there).
 * The "dummy" ribbon on a block is shown only in dev mode (see `SHOW_DUMMY_MARKERS`).
 */
export interface FeatureFlag {
  readonly enabled: boolean;
  readonly dummy: boolean;
  readonly needs: string;
}

const dummy = (needs: string): FeatureFlag => ({
  enabled: true,
  dummy: true,
  needs,
});
const live = (needs = ''): FeatureFlag => ({
  enabled: true,
  dummy: false,
  needs,
});

export const FEATURES = {
  // ---- shell
  'shell.search': dummy(
    'Search of players and games: PlayersStore + GamesStore',
  ),
  'shell.themeSwitch': dummy(
    'Light theme is S10.50; the switch is only a stub',
  ),
  'shell.footer': dummy('Owner texts: address, time, e-mail, socials'),
  'shell.releaseLink': dummy('Release notes: backend of releases (S10.51)'),

  // ---- design features (docs/design/flip-board-and-ribbon.md)
  'design.flipBoard': live('Split-flap digits of the score and the countdown'),
  'design.seasonRibbon': live('GamesStore: every Saturday of the season'),

  // ---- home
  'home.nextGame': dummy(
    'Date and countdown are real; captains of the day, head to head, RSVP are not',
  ),
  'home.lastGame': live('GamesStore: last published game'),
  'home.kpis': live('Games and players of the season'),
  'home.topSeason': live('PlayersStatsStore ranking'),
  'home.hot': dummy('Records and streaks feed (domain)'),
  'home.form': live('Goals per game and wins by team from the games'),
  'home.onThisDay': dummy('Games and photos of past years on this date'),
  'home.birthdays': dummy('Birthdays with the consent of the player (S10.44)'),
  'home.miniCalendar': live(
    'Saturdays from the games; skipped weeks need S10.18',
  ),
  'home.vote': dummy('Votes (S10.35)'),
  'home.captains': live('Record as captain from the metadata'),
  'home.playerFocus': dummy('Player of the week: biggest rise in the table'),
  'home.photos': dummy('Media storage (S10.19)'),
  'home.comments': dummy('Comments (S10.22)'),
  'home.latestGames': live('GamesStore'),
  'home.explore': live(),
  'home.join': live(),

  // ---- games
  'games.list': live('GamesStore is wired; left: MVP names and pagination'),
  'game.scoreboard': live('GamesStore: score and captains'),
  'game.mvp': live('GamesStore: metadata.mvpListIds'),
  'game.events': live(
    'Scorers from the statistics; left: order of goals (S10.27)',
  ),
  'game.map': dummy('Positions on the pitch (S10.38)'),
  'game.squads': live('GamesStore + PlayersStore'),
  'game.story': live('GamesStore: description'),
  'game.media': live('MediaService: photos of the game (S10.19)'),
  'game.comments': dummy('Comments of the game (S10.22)'),

  // ---- players, captains
  'players.ranking': dummy(
    'Ranking by season and system (PlayersStore + statistics)',
  ),
  'player.header': live('PlayersStatsStore'),
  'player.numbers': live('PlayersStatsStore'),
  'player.media': live('MediaService: photos of the player (S10.19)'),
  'player.charts': live(
    'Points per game, form, sources of points from the metadata',
  ),
  'player.radar': dummy('Radar: league averages per axis (S10.58)'),
  'player.rivals': dummy(
    'Opponents and allies from the history of games with squads',
  ),
  'player.captainTab': live('Results by season, first and second draft'),
  'player.captainH2H': dummy(
    'Head to head of captains and first picks (S10.5)',
  ),
  'player.seasons': live('Statistics by season'),
  'captains.ranking': live('Record as captain from the player metadata'),
  'captains.nextDay': dummy(
    'Captains of the next Saturday from the match wizard',
  ),
  'captains.matrix': dummy('Head to head matrix of captains'),

  // ---- league pages
  'seasons.page': live('Top three, awards, seasons compared from the metadata'),
  'seasons.fame': dummy('Wins by colour and records since 1980 (S10.4)'),
  'calendar.page': live(
    'Saturdays are computed, played games from GamesStore; skipped weeks need S10.18',
  ),
  'calendar.events': dummy(
    'Birthdays (S10.44), ends of votes (S10.35), iCal (S10.36)',
  ),
  'rules.page': dummy('Codex of the rules with history (S10.35)'),
  'vote.page': dummy('Votes (S10.35)'),
  'suggest.page': dummy('Anonymous proposals (S10.37)'),
  'scoring.page': dummy('Texts from GLOSSARY.md and the domain package'),
  'compare.systems': dummy('Scoring systems table from @sfl/domain'),
  'compare.people': live('Numbers and form from PlayersStatsStore'),
  'compare.together': dummy(
    'Games together and against each other: needs squads of every game',
  ),
  'media.page': dummy('Media storage and tags (S10.19)'),
  'history.page': dummy('History written by the owner (S10.24)'),
  'profile.account': live('AuthService user'),
  'profile.page': dummy('Account linked to a player (S8.13, S10.17)'),
  'releases.page': dummy('Release notes backend (S10.51)'),
  'states.page': live(),

  // ---- connect
  'connect.pages': dummy('One-day connect links (S8.13)'),

  // ---- admin
  'admin.dashboard': live('Drafts and unlinked players are real'),
  'admin.sidebarCounts': dummy(
    'Counters of the queue, links, comments, releases',
  ),
  'admin.dashboardFeed': dummy(
    'Comments, votes and the action log (S10.22, S10.35)',
  ),
  'admin.wizard': dummy('Match wizard: 6 steps (S10.26..S10.34)'),
  'admin.confirm': dummy('Two confirmations and revoke of a game'),
  'admin.process': dummy('Queue of old games with notes (S10.40)'),
  'admin.players': live(
    'PlayersStore with the edit and delete dialogs; left: archive (S10.32), account status',
  ),
  'admin.newPlayer': dummy('Create player with the full profile'),
  'admin.connect': dummy('Connect links list, QR (S8.13)'),
  'admin.releases': dummy('Technical releases (S10.51)'),
  'admin.comments': dummy('Moderation queue (S10.22)'),
  'admin.schedule': dummy('Schedule, skipped weeks, transfers (S10.18)'),
  'admin.media': live('Upload, caption, links to a game and a player (S10.19)'),
} as const satisfies Record<string, FeatureFlag>;

export type FeatureKey = keyof typeof FEATURES;

export const FEATURE_FLAGS = new InjectionToken<
  Record<FeatureKey, FeatureFlag>
>('FEATURE_FLAGS', { providedIn: 'root', factory: () => FEATURES });

/** The "dummy" ribbon helps to find blocks that still need real data. */
export const SHOW_DUMMY_MARKERS = new InjectionToken<boolean>(
  'SHOW_DUMMY_MARKERS',
  { providedIn: 'root', factory: () => isDevMode() },
);
