import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { AccessTokenStore } from '@shared/auth/access-token.store';
import { injectNotifier } from '@shared/store/inject-notifier';
import { catchError, throwError } from 'rxjs';

import { globalErrorMessage, isGlobalStatus } from './global-error';

/** The forms of `/auth/*` show their own errors; a 401 there is not an expired session. */
const AUTH_ROUTES = /\/auth\/(sign-in|sign-out|refresh)(\?|$)/;

/** N parallel requests fail together: show and redirect once per window. */
const QUIET_MS = 3000;

@Service()
class Once {
  readonly #last = new Map<string, number>();

  first(key: string): boolean {
    const now = Date.now();
    if (now - (this.#last.get(key) ?? Number.NEGATIVE_INFINITY) < QUIET_MS) {
      return false;
    }
    this.#last.set(key, now);
    return true;
  }
}

/**
 * The one place of global HTTP failures. Put it first in the list: it sees an
 * error after the token refresh has failed too.
 *
 * - network error and 5xx: a notification (`isGlobalStatus`; stores skip them);
 * - 401 (the session is gone): to the sign-in page with `returnUrl`, so the
 *   person comes back to the page they were on.
 *
 * The error always goes on untouched: `toResult` still turns it into a value.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const notify = injectNotifier();
  const router = inject(Router);
  const accessToken = inject(AccessTokenStore);
  const once = inject(Once);
  const own = AUTH_ROUTES.test(request.url);

  // The token is cleared by the failed refresh before the error gets here
  const wasSignedIn = accessToken.get() !== null;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !own) {
        if (isGlobalStatus(error.status)) {
          if (once.first('global')) {
            notify.fail(globalErrorMessage(error.status));
          }
        } else if (
          error.status === 401 &&
          // A guest has no session to lose: the screen that asked decides
          // (the token is gone after a failed refresh, so read it before)
          wasSignedIn &&
          !router.url.startsWith('/sign-in') &&
          once.first('401')
        ) {
          notify.notice('Your session has expired. Sign in again.');
          void router.navigate(['/sign-in'], {
            queryParams: { returnUrl: router.url },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
