import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import {
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { jwtInterceptor } from '@shared/interceptors/jwt.interceptor';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHighcharts } from 'highcharts-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withXhr(), withInterceptors([jwtInterceptor])),
    provideAnimations(),
    provideStore(),
    provideHighcharts({ instance: () => import('highcharts') }),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
