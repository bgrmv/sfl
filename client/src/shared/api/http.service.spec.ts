import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HttpService } from './http.service';

const API = 'https://sfl.com:3001/rest';
const ok = <T>(data: T) => ({ ok: true, data });
const failure = {
  ok: false,
  error: { status: 404, code: 'NOT_FOUND', message: 'No game' },
};

describe('HttpService', () => {
  let http: HttpTestingController;
  let service: HttpService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(HttpService);
  });

  afterEach(() => http.verify());

  it('GET gives the payload of { ok, data } and sends the params', () => {
    let result: unknown;
    service.get('games', { season: 2025 }).subscribe(value => (result = value));

    const request = http.expectOne(r => r.url === `${API}/games`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('season')).toBe('2025');
    request.flush(ok([{ id: 'g1' }]));

    expect(result).toEqual([{ id: 'g1' }]);
  });

  it('unwraps only once: a service must not read `.data` again', () => {
    let result: unknown;
    service.get('charts/top').subscribe(value => (result = value));
    http.expectOne(`${API}/charts/top`).flush(ok([1, 2]));

    expect(Array.isArray(result)).toBe(true);
  });

  it.each([
    ['post', 'POST', (s: HttpService) => s.post('games', { id: 'g1' })],
    ['put', 'PUT', (s: HttpService) => s.put('games/g1', { id: 'g1' })],
    ['patch', 'PATCH', (s: HttpService) => s.patch('games/g1', { id: 'g1' })],
    ['delete', 'DELETE', (s: HttpService) => s.delete('games/g1')],
  ])('%s uses %s and unwraps data', (_name, method, call) => {
    let result: unknown;
    call(service).subscribe(value => (result = value));

    const request = http.expectOne(r => r.url.startsWith(`${API}/games`));
    expect(request.request.method).toBe(method);
    request.flush(ok({ id: 'g1' }));

    expect(result).toEqual({ id: 'g1' });
  });

  it('an { ok: false } answer arrives in the error channel with the API error', () => {
    let error: unknown;
    service.get('games/missing').subscribe({ error: e => (error = e) });

    http
      .expectOne(`${API}/games/missing`)
      .flush(failure, { status: 404, statusText: 'Not Found' });

    // An HTTP error status is an HttpErrorResponse whose body is the API answer
    expect((error as { error: typeof failure }).error).toEqual(failure);
  });
});
