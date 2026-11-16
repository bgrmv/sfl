import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Service } from '@angular/core';
import { injectNotifier } from '@shared/store/inject-notifier';

/** One notification per burst: a broken template fails on every change detection. */
const QUIET_MS = 5000;

/**
 * What nobody caught (a bug in a component, a rejected promise). It goes to
 * the console as before and the person gets a short notice instead of a
 * silently dead screen. An `HttpErrorResponse` was already shown by
 * `httpErrorInterceptor` or by the store that asked, so it is only logged.
 */
@Service()
export class GlobalErrorHandler implements ErrorHandler {
  readonly #notify = injectNotifier();
  #lastShown = Number.NEGATIVE_INFINITY;

  handleError(error: unknown): void {
    console.error(error);
    if (error instanceof HttpErrorResponse) return;

    const now = Date.now();
    if (now - this.#lastShown < QUIET_MS) return;
    this.#lastShown = now;
    this.#notify.notice(
      'Something went wrong. Reload the page if it persists.',
    );
  }
}
