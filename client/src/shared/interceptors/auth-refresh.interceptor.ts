import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AccessTokenStore } from '../services/access-token.store';
import { AuthService } from '../services/auth.service';

const AUTH_ROUTES = /\/auth\/(sign-in|sign-out|refresh)(\?|$)/;

/**
 * An expired access token (401) is replaced once through `/auth/refresh`, and
 * the request is repeated. Parallel requests share one refresh. If the session
 * is gone too, the original error goes on untouched (the body of the API
 * error stays for `toResult`).
 */
export const authRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const accessToken = inject(AccessTokenStore);

  return next(request).pipe(
    catchError((error: unknown) => {
      const expired =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        request.headers.has('Authorization') &&
        !AUTH_ROUTES.test(request.url);

      if (!expired) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap(() =>
          next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${accessToken.get()}` },
            }),
          ),
        ),
        catchError(() => throwError(() => error)),
      );
    }),
  );
};
