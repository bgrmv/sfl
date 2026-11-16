import { Routes } from '@angular/router';
import { authGuard } from './admin.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Home',
    loadComponent: () => import('@pages/home').then(m => m.HomeComponent),
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
  {
    path: 'players',
    title: 'Players',
    children: [
      {
        path: '',
        title: 'Players',
        loadComponent: () =>
          import('@pages/player-list').then(c => c.PlayersMainPageComponent),
      },
      {
        path: ':id',
        title: 'Player details',
        loadComponent: () =>
          import('@pages/player-details').then(
            c => c.PlayerDetailsPageComponent,
          ),
        // TODO Resolver here
      },
    ],
  },
  {
    path: 'games',
    title: 'Games',
    children: [
      {
        path: '',
        title: 'Games',
        loadComponent: () =>
          import('@pages/game-list').then(c => c.GamesPageComponent),
      },
      {
        path: 'create',
        title: 'Create game',
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
        title: 'Game details',
        loadComponent: () =>
          import('@pages/game-details').then(c => c.GamePageDetailsComponent),
        // TODO Resolver here
      },
    ],
  },
];
