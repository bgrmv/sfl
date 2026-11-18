import { Routes } from '@angular/router';
import { authGuard, staffGuard } from './admin.guard';

/**
 * Routes of the "Табло" design. The pages marked DUMMY (see `@shared/config/feature-flags`)
 * show made up data. The working pages with real data are kept under `/legacy/*` until
 * every design block is wired to its store.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    title: 'Home',
    loadComponent: () => import('@pages/home').then(m => m.HomeComponent),
  },
  {
    path: 'sign-in',
    title: 'Sign In',
    loadComponent: () =>
      import('@pages/auth-sign-in').then(c => c.SignInPageComponent),
  },

  // ---- players
  {
    path: 'players',
    title: 'Players',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@pages/players-board').then(c => c.PlayersBoardPageComponent),
      },
      {
        path: ':id',
        title: 'Player',
        loadComponent: () =>
          import('@pages/player-board').then(c => c.PlayerBoardPageComponent),
      },
    ],
  },
  {
    path: 'captains',
    title: 'Captains',
    loadComponent: () =>
      import('@pages/captains-board').then(c => c.CaptainsBoardPageComponent),
  },

  // ---- games (create and edit are the working forms)
  {
    path: 'games',
    title: 'Games',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@pages/games-board').then(c => c.GamesBoardPageComponent),
      },
      {
        path: 'create',
        title: 'Create game',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/game-edit').then(c => c.GameFormPageComponent),
      },
      {
        path: 'edit/:season/:number',
        title: 'Edit game',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/game-edit').then(c => c.GameFormPageComponent),
      },
      {
        path: 'details/:season/:number',
        title: 'Game',
        loadComponent: () =>
          import('@pages/game-board').then(c => c.GameBoardPageComponent),
      },
    ],
  },

  // ---- league
  {
    path: 'seasons',
    title: 'Seasons',
    loadComponent: () =>
      import('@pages/league').then(c => c.SeasonsPageComponent),
  },
  {
    path: 'calendar',
    title: 'Calendar',
    loadComponent: () =>
      import('@pages/league').then(c => c.CalendarPageComponent),
  },
  {
    path: 'history',
    title: 'History',
    loadComponent: () =>
      import('@pages/league').then(c => c.HistoryPageComponent),
  },
  {
    path: 'privacy',
    title: 'Privacy',
    loadComponent: () =>
      import('@pages/league').then(c => c.PrivacyPageComponent),
  },
  {
    path: 'releases',
    title: 'Release notes',
    loadComponent: () =>
      import('@pages/league').then(c => c.ReleasesPageComponent),
  },
  {
    path: 'states',
    title: 'States',
    loadComponent: () =>
      import('@pages/league').then(c => c.StatesPageComponent),
  },
  {
    path: 'media',
    title: 'Photo and video',
    loadComponent: () => import('@pages/media').then(c => c.MediaPageComponent),
  },

  // ---- rules
  {
    path: 'rules',
    title: 'Codex',
    loadComponent: () =>
      import('@pages/rules-hub').then(c => c.RulesPageComponent),
  },
  {
    path: 'vote',
    title: 'Vote',
    loadComponent: () =>
      import('@pages/rules-hub').then(c => c.VotePageComponent),
  },
  {
    path: 'suggest',
    title: 'Proposal or complaint',
    loadComponent: () =>
      import('@pages/rules-hub').then(c => c.SuggestPageComponent),
  },
  {
    path: 'scoring',
    title: 'How points work',
    loadComponent: () =>
      import('@pages/rules-hub').then(c => c.ScoringPageComponent),
  },
  {
    path: 'compare',
    title: 'Compare',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@pages/compare').then(c => c.ComparePeoplePageComponent),
      },
      {
        path: 'systems',
        title: 'Compare systems',
        loadComponent: () =>
          import('@pages/compare').then(c => c.CompareSystemsPageComponent),
      },
    ],
  },

  // ---- account
  {
    path: 'profile',
    title: 'My profile',
    loadComponent: () =>
      import('@pages/profile').then(c => c.ProfilePageComponent),
  },
  {
    path: 'connect',
    title: 'Connect account',
    loadComponent: () =>
      import('@pages/connect').then(c => c.ConnectPageComponent),
  },
  // The one-day link of an admin, and the two places the API sends the browser back to (S8.13)
  {
    path: 'connect/failed',
    title: 'Connect account',
    data: { result: 'failed' },
    loadComponent: () =>
      import('@pages/connect').then(c => c.ConnectInvitationPageComponent),
  },
  {
    path: 'connect/:token',
    title: 'Connect account',
    loadComponent: () =>
      import('@pages/connect').then(c => c.ConnectInvitationPageComponent),
  },
  {
    path: 'connected',
    title: 'Connected',
    data: { result: 'connected' },
    loadComponent: () =>
      import('@pages/connect').then(c => c.ConnectInvitationPageComponent),
  },

  // ---- admin
  {
    path: 'admin',
    title: 'Admin',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('@pages/admin').then(c => c.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminDashboardPageComponent),
      },
      {
        path: 'wizard',
        title: 'New game',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminWizardPageComponent),
      },
      {
        path: 'wizard/:season/:number',
        title: 'Edit game',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminWizardPageComponent),
      },
      {
        path: 'confirm',
        title: 'Confirm game',
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminConfirmPageComponent),
      },
      {
        path: 'process',
        title: 'Process games',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminProcessPageComponent),
      },
      {
        path: 'players',
        title: 'Players',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminPlayersPageComponent),
      },
      {
        path: 'players/new',
        title: 'New player',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminNewPlayerPageComponent),
      },
      {
        path: 'connect',
        title: 'Connect accounts',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminConnectPageComponent),
      },
      {
        path: 'users',
        title: 'Users and access',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminUsersPageComponent),
      },
      {
        path: 'schedule',
        title: 'Schedule',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminSchedulePageComponent),
      },
      {
        path: 'comments',
        title: 'Comments',
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminCommentsPageComponent),
      },
      {
        path: 'media',
        title: 'Media',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminMediaPageComponent),
      },
      {
        path: 'releases',
        title: 'Releases',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@pages/admin').then(c => c.AdminReleasesPageComponent),
      },
    ],
  },

  // ---- legacy pages with real data (Material) until the design blocks are wired
  {
    path: 'legacy',
    children: [
      {
        path: 'games',
        loadComponent: () =>
          import('@pages/game-list').then(c => c.GamesPageComponent),
      },
      {
        path: 'games/:season/:number',
        loadComponent: () =>
          import('@pages/game-details').then(c => c.GamePageDetailsComponent),
      },
      {
        path: 'players',
        loadComponent: () =>
          import('@pages/player-list').then(c => c.PlayersMainPageComponent),
      },
      {
        path: 'players/:id',
        loadComponent: () =>
          import('@pages/player-details').then(
            c => c.PlayerDetailsPageComponent,
          ),
      },
      {
        path: 'captains',
        loadComponent: () =>
          import('@pages/captain-list').then(c => c.CaptainsPageComponent),
      },
    ],
  },

  {
    path: '**',
    title: 'Not found',
    loadComponent: () =>
      import('@pages/league').then(c => c.NotFoundPageComponent),
  },
];
