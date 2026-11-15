import { Routes } from '@angular/router';
import { authGuard } from './games.resolver';

export const GAMES_ROUTES: Routes = [
  {
    path: 'games',
    title: 'Games',
    children: [
      {
        path: '',
        title: 'Games',
        loadComponent: () =>
          import('./pages/games-page/games-page.component').then(
            c => c.GamesPageComponent,
          ),
      },
      {
        path: 'create',
        title: 'Create game',
        loadComponent: () =>
          import('./widgets/game-creation-widget/game-creation-widget.component').then(
            c => c.GameCreationWidgetComponent,
          ),
      },
      {
        path: 'edit/:season/:number',
        title: 'Edit game',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./widgets/game-creation-widget/game-creation-widget.component').then(
            c => c.GameCreationWidgetComponent,
          ),
      },
      {
        path: 'details/:season/:number',
        title: 'Game details',
        loadComponent: () =>
          import('./pages/game-page-details/game-page-details.component').then(
            c => c.GamePageDetailsComponent,
          ),
        // TODO Resolver here
      },
    ],
  },
];
