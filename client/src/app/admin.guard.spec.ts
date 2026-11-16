import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '@shared/auth/auth.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeReturnUrl } from '@shared/auth/return-url';

import { authGuard } from './admin.guard';
import { routes } from './app.routes';

describe('authGuard', () => {
  const user = signal<{ roles: string[] } | null>(null);
  const isAdmin = () => user()?.roles.includes('ADMIN') ?? false;
  let router: Router;

  beforeEach(() => {
    user.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user, isAdmin } },
      ],
    });
    router = TestBed.inject(Router);
  });

  const run = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard(null as never, { url } as RouterStateSnapshot),
    );

  it('lets an admin in', () => {
    user.set({ roles: ['ADMIN'] });

    expect(run('/games/create')).toBe(true);
  });

  it('sends a guest to the sign-in page and remembers where they went', () => {
    const result = run('/games/create') as UrlTree;

    expect(router.serializeUrl(result)).toBe(
      '/sign-in?returnUrl=%2Fgames%2Fcreate',
    );
  });

  it('sends a signed-in person without the role to the games', () => {
    user.set({ roles: ['USER'] });
    const result = run('/games/create') as UrlTree;

    expect(router.serializeUrl(result)).toBe('/games');
  });

  describe('routes', () => {
    const guarded = (path: string) => {
      const [head, ...rest] = path.split('/');
      const parent = routes.find(route => route.path === head);
      const child = parent?.children?.find(c => c.path === rest.join('/'));
      return child?.canActivate?.includes(authGuard) ?? false;
    };

    it.each(['games/create', 'games/edit/:season/:number'])('guards %s', path =>
      expect(guarded(path)).toBe(true),
    );

    it.each([
      'games',
      'games/details/:season/:number',
      'players',
      'players/:id',
    ])('keeps %s public', path => {
      const [head, ...rest] = path.split('/');
      const parent = routes.find(route => route.path === head);
      const child = parent?.children?.find(
        c => c.path === rest.join('/') || (!rest.length && c.path === ''),
      );
      expect(child?.canActivate).toBeUndefined();
    });
  });
});

describe('the way back after the sign-in (S3.10)', () => {
  @Component({ template: '' })
  class Stub {}

  const API = 'https://sfl.com:3001/rest';

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'sign-in', component: Stub },
          { path: 'games', component: Stub },
          { path: 'games/create', component: Stub, canActivate: [authGuard] },
        ]),
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('a guest asks for games/create, signs in as admin and lands there', async () => {
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);

    await router.navigateByUrl('/games/create');
    expect(router.url).toBe('/sign-in?returnUrl=%2Fgames%2Fcreate');
    const returnUrl = safeReturnUrl(
      router.parseUrl(router.url).queryParams['returnUrl'],
    );

    // what SignInComponent does: navigate when the sign-in completes
    const landed = new Promise<boolean>(resolve =>
      auth.signIn({ email: 'a@b.c', password: 'ok' }).subscribe(() => {
        void router.navigateByUrl(returnUrl).then(resolve);
      }),
    );
    http.expectOne(`${API}/auth/sign-in`).flush({
      ok: true,
      data: { accessToken: 't' },
    });
    vi.advanceTimersByTime(1500);
    http.expectOne(`${API}/auth/whoami`).flush({
      ok: true,
      data: { id: 'u1', email: 'a@b.c', roles: ['ADMIN'] },
    });

    expect(await landed).toBe(true);
    expect(router.url).toBe('/games/create');
  });
});
