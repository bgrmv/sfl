import { Service } from '@angular/core';

/**
 * The access token lives in memory only: not in `localStorage` or
 * `sessionStorage`, where any script of the page (XSS) could read it. A reload
 * loses it, and the app gets a new one from the HttpOnly refresh cookie
 * (`AuthService.restoreSession`).
 */
@Service()
export class AccessTokenStore {
  #token: string | null = null;

  get(): string | null {
    return this.#token;
  }

  set(token: string | null): void {
    this.#token = token;
  }
}
