import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ApiError } from '@sfl/schemas';
import { apiErrorMessage } from '@shared/api/api-error-message';
import { isGlobalApiError } from '@shared/api/global-error';

export interface Notifier {
  /** A short confirmation of a user action ("Player saved"). */
  success(message: string): void;
  /**
   * Reports a failed request; returns the text shown, for the state. A network
   * error and a 5xx are already shown by `httpErrorInterceptor`: here they are
   * only logged, so the person sees one notification, not two.
   */
  error(error: ApiError): string;
  /** Reports a failure that is not an API answer (a rule, a missing item). */
  fail(message: string): void;
  /** A notice that is not an error of a store (an expired session); no log. */
  notice(message: string): void;
}

/**
 * The rule of the client: every action of the user gets an answer. A store
 * calls `success` after the server accepted a change and `error` when it did
 * not. The only place with the snack bar; global failures (S3.10) come here
 * from `httpErrorInterceptor` and `GlobalErrorHandler`.
 */
export function injectNotifier(): Notifier {
  const snackBar = inject(MatSnackBar);

  return {
    success: message => {
      snackBar.open(message, undefined, { duration: 3000 });
    },
    error: error => {
      const message = apiErrorMessage(error);
      console.error(error);
      if (!isGlobalApiError(error)) {
        snackBar.open(message, 'Close', { duration: 10000 });
      }
      return message;
    },
    fail: message => {
      console.error(message);
      snackBar.open(message, 'Close', { duration: 10000 });
    },
    notice: message => {
      snackBar.open(message, 'Close', { duration: 10000 });
    },
  };
}
