import { isDevMode } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export const environment = {
  // Prefilled into the sign-in form; exists only in the local dev environment
  localCredentials: {
    email: 'dev-admin@sfl.local',
    password: 'dev-admin',
  },
  API_KEY: 'https://sfl.com:3001/rest',
  providers: [
    provideStoreDevtools({
      maxAge: 25,
      autoPause: true,
      trace: false,
      traceLimit: 75,
      connectInZone: true,
      logOnly: !isDevMode(),
    }),
  ],
};
