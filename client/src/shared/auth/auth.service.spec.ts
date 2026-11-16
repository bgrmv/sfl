import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authRefreshInterceptor } from './auth-refresh.interceptor';
import { jwtInterceptor } from './jwt.interceptor';
import { AccessTokenStore } from './access-token.store';
import { AuthService } from './auth.service';
import { HttpService } from '@shared/api/http.service';

const API = 'https://sfl.com:3001/rest';
const user = { id: 'u1', email: 'admin@sfl.test', roles: ['ADMIN'] };
const ok = <T>(data: T) => ({ ok: true, data });
const failure = (status: number, code: string) => ({
  ok: false,
  error: { status, code, message: code },
});

describe('session in memory (S8.12)', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let token: AccessTokenStore;
  let api: HttpService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([jwtInterceptor, authRefreshInterceptor]),
        ),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    token = TestBed.inject(AccessTokenStore);
    api = TestBed.inject(HttpService);
  });

  afterEach(() => http.verify());

  describe('restoreSession', () => {
    it('gives the session back from the refresh cookie', () => {
      auth.restoreSession().subscribe();

      const req = http.expectOne(`${API}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(ok({ accessToken: 'new-token', user }));

      expect(token.get()).toBe('new-token');
      expect(auth.user()).toEqual(user);
      expect(auth.isAdmin()).toBe(true);
    });

    it('is a guest without a cookie and does not fail', () => {
      const done = vi.fn();
      auth.restoreSession().subscribe({ complete: done });

      http
        .expectOne(`${API}/auth/refresh`)
        .flush(failure(401, 'UNAUTHORIZED'), {
          status: 401,
          statusText: 'Unauthorized',
        });

      expect(done).toHaveBeenCalled();
      expect(token.get()).toBeNull();
      expect(auth.user()).toBeNull();
    });

    it('never writes the token to localStorage or sessionStorage', () => {
      const set = vi.spyOn(Storage.prototype, 'setItem');
      auth.restoreSession().subscribe();
      http
        .expectOne(`${API}/auth/refresh`)
        .flush(ok({ accessToken: 'secret-token', user }));

      expect(set).not.toHaveBeenCalled();
      set.mockRestore();
    });

    it('removes the token that an old version left in localStorage', () => {
      localStorage.setItem('accessToken', 'old');
      auth.restoreSession().subscribe();
      http
        .expectOne(`${API}/auth/refresh`)
        .flush(ok({ accessToken: 'n', user }));

      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('the header', () => {
    it('carries the token from memory', () => {
      token.set('in-memory');
      api.get('teams').subscribe();

      const req = http.expectOne(`${API}/teams`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer in-memory');
      req.flush(ok([]));
    });

    it('has no header without a token', () => {
      api.get('teams').subscribe();

      const req = http.expectOne(`${API}/teams`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush(ok([]));
    });
  });

  describe('an expired access token', () => {
    const unauthorized = { status: 401, statusText: 'Unauthorized' };

    it('is replaced once and the request is repeated with the new token', () => {
      token.set('expired');
      const result = vi.fn();
      api.get('games').subscribe(result);

      http
        .expectOne(`${API}/games`)
        .flush(failure(401, 'UNAUTHORIZED'), unauthorized);
      http
        .expectOne(`${API}/auth/refresh`)
        .flush(ok({ accessToken: 'fresh', user }));

      const retried = http.expectOne(`${API}/games`);
      expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh');
      retried.flush(ok([{ id: 'g1' }]));

      expect(result).toHaveBeenCalledWith([{ id: 'g1' }]);
    });

    it('is refreshed once for parallel requests', () => {
      token.set('expired');
      api.get('games').subscribe();
      api.get('players').subscribe();

      http
        .expectOne(`${API}/games`)
        .flush(failure(401, 'UNAUTHORIZED'), unauthorized);
      http
        .expectOne(`${API}/players`)
        .flush(failure(401, 'UNAUTHORIZED'), unauthorized);

      http
        .expectOne(`${API}/auth/refresh`)
        .flush(ok({ accessToken: 'fresh', user }));

      http.expectOne(`${API}/games`).flush(ok([]));
      http.expectOne(`${API}/players`).flush(ok([]));
    });

    it('passes the original error on when the session is gone too', () => {
      token.set('expired');
      const error = vi.fn();
      api.get('games').subscribe({ error });

      http
        .expectOne(`${API}/games`)
        .flush(failure(401, 'UNAUTHORIZED'), unauthorized);
      http
        .expectOne(`${API}/auth/refresh`)
        .flush(failure(401, 'UNAUTHORIZED'), unauthorized);

      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0][0].error.error.code).toBe('UNAUTHORIZED');
      expect(token.get()).toBeNull();
      expect(auth.user()).toBeNull();
    });

    it('does not try to refresh a request that had no token', () => {
      const error = vi.fn();
      api.get('games').subscribe({ error });

      http
        .expectOne(`${API}/games`)
        .flush(failure(401, 'UNAUTHORIZED'), unauthorized);

      expect(error).toHaveBeenCalled();
    });

    it('does not refresh after a failed sign-in', () => {
      const error = vi.fn();
      token.set('whatever');
      auth.signIn({ email: 'a@b.c', password: 'bad' }).subscribe({ error });

      http
        .expectOne(`${API}/auth/sign-in`)
        .flush(failure(401, 'UNAUTHORIZED'), unauthorized);

      expect(error).toHaveBeenCalled();
    });
  });

  it('sign-out clears the token and the user', () => {
    token.set('t');
    auth.setUser(user);
    auth.signOut().subscribe();

    http.expectOne(`${API}/auth/sign-out`).flush(ok({ accessToken: null }));

    expect(token.get()).toBeNull();
    expect(auth.user()).toBeNull();
  });

  describe('tabs of one browser', () => {
    let other: BroadcastChannel;

    beforeEach(() => {
      other = new BroadcastChannel('sfl-auth');
    });
    afterEach(() => other.close());

    it('signing out in another tab signs this one out', async () => {
      token.set('t');
      auth.setUser(user);

      other.postMessage('signed-out');

      await vi.waitFor(() => expect(auth.user()).toBeNull());
      expect(token.get()).toBeNull();
    });

    it('tells the other tabs about a sign-out', async () => {
      const received = vi.fn();
      other.onmessage = ({ data }) => received(data);
      token.set('t');

      auth.signOut().subscribe();
      http.expectOne(`${API}/auth/sign-out`).flush(ok({ accessToken: null }));

      await vi.waitFor(() =>
        expect(received).toHaveBeenCalledWith('signed-out'),
      );
    });

    it('a tab without a session takes it from the cookie after a sign-in elsewhere', async () => {
      other.postMessage('signed-in');

      await vi.waitFor(() =>
        http
          .expectOne(`${API}/auth/refresh`)
          .flush(ok({ accessToken: 'n', user })),
      );
      expect(auth.user()).toEqual(user);
    });

    it('a tab with a session does not ask again', async () => {
      auth.setUser(user);
      other.postMessage('signed-in');
      await new Promise(resolve => setTimeout(resolve, 50));

      http.expectNone(`${API}/auth/refresh`);
    });
  });
  describe('signIn waits for the user', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const submit = () => {
      const done = vi.fn();
      auth.signIn({ email: 'a@b.c', password: 'ok' }).subscribe({ next: done });
      http.expectOne(`${API}/auth/sign-in`).flush(ok({ accessToken: 't' }));
      vi.advanceTimersByTime(1500);
      return done;
    };

    it('does not finish before whoami answers, so the guard sees the role', () => {
      const done = submit();
      const whoami = http.expectOne(`${API}/auth/whoami`);

      expect(done).not.toHaveBeenCalled();
      expect(auth.isAdmin()).toBe(false);

      whoami.flush(ok(user));

      expect(done).toHaveBeenCalledTimes(1);
      expect(auth.isAdmin()).toBe(true);
    });

    it('still signs in when whoami fails', () => {
      const done = submit();
      http
        .expectOne(`${API}/auth/whoami`)
        .flush(failure(500, 'INTERNAL_ERROR'), {
          status: 500,
          statusText: 'x',
        });

      expect(done).toHaveBeenCalledTimes(1);
      expect(token.get()).toBe('t');
    });
  });
});
