import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AccessTokenStore } from './access-token.store';

/**
 * Puts the access token (from memory) into the header and lets the browser
 * send the HttpOnly refresh cookie (it goes to `/auth/*` only).
 */
export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken = inject(AccessTokenStore).get();

  return next(
    request.clone({
      withCredentials: true,
      setHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    }),
  );
};
