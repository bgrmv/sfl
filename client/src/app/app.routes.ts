import { Routes } from '@angular/router';
import { GAMES_ROUTES } from '@entities/games';
import { PLAYERS_ROUTES } from '@entities/players';

export const routes: Routes = [
  {
    path: '',
    title: 'Home',
    loadComponent: () =>
      import('src/pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'home',
    title: 'Home',
    loadComponent: () =>
      import('src/pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'sign-in',
    title: 'Sign In',
    loadComponent: () =>
      import('../pages/sign-in-page/sign-in-page.component').then(
        c => c.SignInPageComponent,
      ),
  },
  ...PLAYERS_ROUTES,
  ...GAMES_ROUTES,
];
