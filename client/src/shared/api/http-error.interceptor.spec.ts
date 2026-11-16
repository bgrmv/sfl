import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccessTokenStore } from '@shared/auth/access-token.store';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  const open = vi.fn();
  const navigate = vi.fn();
  let url = '/games/create';

  beforeEach(() => {
    open.mockReset();
    navigate.mockReset();
    url = '/games/create';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: { open } },
        {
          provide: Router,
          useValue: {
            navigate,
            get url() {
              return url;
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  const fail = (path: string, status: number) => {
    let caught: unknown;
    client.get(path).subscribe({ error: error => (caught = error) });
    http.expectOne(path).flush({}, { status, statusText: 'x' });
    return caught as { status: number };
  };

  it('shows a notification when the server is not reachable', () => {
    let caught: unknown;
    client.get('/x').subscribe({ error: error => (caught = error) });
    http.expectOne('/x').error(new ProgressEvent('error'));

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toContain('No connection');
    expect(caught).toBeTruthy();
  });

  it('shows a notification for a 5xx and passes the error on', () => {
    const error = fail('/x', 503);

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toContain('Server error');
    expect(error.status).toBe(503);
  });

  it('stays silent for a 4xx: the screen that asked reports it', () => {
    expect(fail('/x', 404).status).toBe(404);
    expect(fail('/y', 400).status).toBe(400);

    expect(open).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends a 401 to the sign-in page with the page to come back to', () => {
    TestBed.inject(AccessTokenStore).set('t');
    fail('/games/1', 401);

    expect(navigate).toHaveBeenCalledWith(['/sign-in'], {
      queryParams: { returnUrl: '/games/create' },
    });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('leaves a 401 of a guest (no token, no session to lose) alone', () => {
    expect(fail('/games/1', 401).status).toBe(401);

    expect(navigate).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('reports parallel failures once', () => {
    TestBed.inject(AccessTokenStore).set('t');
    ['/a', '/b', '/c'].forEach(path => fail(path, 401));
    ['/d', '/e', '/f'].forEach(path => fail(path, 503));

    expect(navigate).toHaveBeenCalledTimes(1);
    // one for the expired session, one for the server
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('does not redirect from the sign-in page itself', () => {
    TestBed.inject(AccessTokenStore).set('t');
    url = '/sign-in?returnUrl=%2Fgames';
    fail('/games/1', 401);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves the failed sign-in and refresh to their own forms', () => {
    fail('/rest/auth/sign-in', 401);
    fail('/rest/auth/refresh', 401);
    fail('/rest/auth/sign-in', 500);
    fail('/rest/auth/refresh', 500);

    expect(navigate).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});
