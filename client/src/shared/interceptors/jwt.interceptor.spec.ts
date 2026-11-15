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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AccessTokenStore } from '../services/access-token.store';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let token: AccessTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    token = TestBed.inject(AccessTokenStore);
  });

  afterEach(() => http.verify());

  it('puts the token from memory into Authorization', () => {
    token.set('abc');
    client.get('/x').subscribe();

    const request = http.expectOne('/x').request;
    expect(request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('sends no Authorization header without a token', () => {
    client.get('/x').subscribe();

    expect(http.expectOne('/x').request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('always sends cookies (the refresh cookie is HttpOnly)', () => {
    client.get('/x').subscribe();

    expect(http.expectOne('/x').request.withCredentials).toBe(true);
  });

  it('reads the token on every request, not once', () => {
    client.get('/a').subscribe();
    http.expectOne('/a').flush({});

    token.set('later');
    client.get('/b').subscribe();

    expect(http.expectOne('/b').request.headers.get('Authorization')).toBe(
      'Bearer later',
    );
  });
});
