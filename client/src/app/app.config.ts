import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import {
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { authRefreshInterceptor } from '@shared/interceptors/auth-refresh.interceptor';
import { jwtInterceptor } from '@shared/interceptors/jwt.interceptor';
import { AuthService } from '@shared/services/auth.service';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHighcharts } from 'highcharts-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withXhr(),
      withInterceptors([jwtInterceptor, authRefreshInterceptor]),
    ),
    // The session comes back from the refresh cookie before the first screen
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideAnimations(),
    provideStore(),
    provideHighcharts({ instance: () => import('highcharts') }),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
