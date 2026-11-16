import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ApiError } from '@sfl/schemas';
import { apiErrorMessage } from '@shared/api/api-error-message';

export interface Notifier {
  /** A short confirmation of a user action ("Player saved"). */
  success(message: string): void;
  /** Reports a failed request; returns the text shown, for the state. */
  error(error: ApiError): string;
  /** Reports a failure that is not an API answer (a rule, a missing item). */
  fail(message: string): void;
}

/**
 * The rule of the client: every action of the user gets an answer. A store
 * calls `success` after the server accepted a change and `error` when it did
 * not. One place, so the global notifications of S3.10 replace the snack bar
 * here and nowhere else.
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
      snackBar.open(message, 'Close', { duration: 10000 });
      return message;
    },
    fail: message => {
      console.error(message);
      snackBar.open(message, 'Close', { duration: 10000 });
    },
  };
}
