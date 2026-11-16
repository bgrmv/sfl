import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { authRefreshInterceptor } from '@shared/interceptors/auth-refresh.interceptor';
import { jwtInterceptor } from '@shared/interceptors/jwt.interceptor';
import { AuthService } from '@shared/services/auth.service';
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
    provideHighcharts({ instance: () => import('highcharts') }),
  ],
};
