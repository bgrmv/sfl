import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { GlobalErrorHandler } from '@shared/api/global-error-handler';
import { httpErrorInterceptor } from '@shared/api/http-error.interceptor';
import { authRefreshInterceptor } from '@shared/auth/auth-refresh.interceptor';
import { jwtInterceptor } from '@shared/auth/jwt.interceptor';
import { AuthService } from '@shared/auth/auth.service';
import { provideHighcharts } from 'highcharts-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(
      withXhr(),
      // httpErrorInterceptor first: it sees the error after the refresh failed
      withInterceptors([
        httpErrorInterceptor,
        jwtInterceptor,
        authRefreshInterceptor,
      ]),
    ),
    // The session comes back from the refresh cookie before the first screen
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideAnimations(),
    provideHighcharts({ instance: () => import('highcharts') }),
  ],
};
