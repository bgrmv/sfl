import { computed, DestroyRef, inject, signal, Service } from '@angular/core';
import {
  catchError,
  delay,
  EMPTY,
  finalize,
  map,
  Observable,
  of,
  share,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AccessTokenStore } from './access-token.store';
import { HttpService } from '@shared/api/http.service';

interface User {
  id: string;
  email: string;
  roles: string[];
}

interface Session {
  accessToken: string;
  user: User;
}

@Service()
export class AuthService {
  private readonly httpService = inject(HttpService);
  private readonly accessToken = inject(AccessTokenStore);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();

  public readonly isAdmin = computed(() => {
    return this.user()?.roles.some(role => role === 'ADMIN') ?? false;
  });

  /**
   * Tabs of one browser share the refresh cookie but not the memory. Signing
   * out in one tab signs out the others; signing in lets the others pick the
   * session up from the cookie.
   */
  readonly #channel =
    typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel('sfl-auth');

  constructor() {
    if (this.#channel) {
      this.#channel.onmessage = ({ data }) => {
        if (data === 'signed-out') {
          this.endSession();
        } else if (data === 'signed-in' && !this.user()) {
          this.refresh().subscribe({ error: () => undefined });
        }
      };
      inject(DestroyRef).onDestroy(() => this.#channel?.close());
    }
  }

  /** One refresh at a time: parallel 401s wait for the same request. */
  #refreshing$: Observable<Session> | null = null;

  setUser(user: User | null) {
    this._user.set(user);
  }

  /**
   * At the start of the app: a valid refresh cookie gives the session back,
   * no cookie means a guest. Never fails, so the app always starts.
   */
  restoreSession(): Observable<void> {
    // Before S8.12 the token lay in localStorage: clean up what is left there
    try {
      localStorage.removeItem('accessToken');
    } catch {
      // storage is not available: nothing to clean
    }

    return this.refresh().pipe(
      map(() => undefined),
      catchError(() => EMPTY),
    );
  }

  /** A new access token and the user, from the HttpOnly refresh cookie. */
  refresh(): Observable<Session> {
    this.#refreshing$ ??= this.httpService.post<Session>('auth/refresh').pipe(
      tap(({ accessToken, user }) => {
        this.accessToken.set(accessToken);
        this.setUser(user);
      }),
      catchError(error => {
        this.endSession();
        return throwError(() => error);
      }),
      finalize(() => (this.#refreshing$ = null)),
      share(),
    );

    return this.#refreshing$;
  }

  /** The user of the access token; a failure leaves the session as it is. */
  private loadUser(): Observable<unknown> {
    return this.httpService.get<User>('auth/whoami').pipe(
      tap(user => {
        if (user) {
          this.setUser({ id: user.id, email: user.email, roles: user.roles });
        }
      }),
      catchError(() => of(null)),
    );
  }

  signIn(payload: { email: string; password: string }) {
    return this.httpService
      .post<{ email: string; password: string }, { accessToken: string }>(
        'auth/sign-in',
        payload,
      )
      .pipe(
        delay(1500),
        tap(response => {
          if (response?.accessToken) this.accessToken.set(response.accessToken);
        }),
        // The sign-in ends when the user is known: the page after it (a route
        // with a guard) needs the role
        switchMap(response => {
          if (!response?.accessToken) return of(response);
          return this.loadUser().pipe(
            map(() => response),
            tap(() => this.#channel?.postMessage('signed-in')),
          );
        }),
      );
  }

  signOut() {
    return this.httpService.post<unknown>('auth/sign-out').pipe(
      tap(() => {
        this.endSession();
        this.#channel?.postMessage('signed-out');
      }),
    );
  }

  private endSession() {
    this.accessToken.set(null);
    this.setUser(null);
  }
}
