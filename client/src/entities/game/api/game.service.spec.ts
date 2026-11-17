import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GameService } from './game.service';

const API = 'https://sfl.com:3001/rest';
const ok = <T>(data: T) => ({ ok: true, data });

const game = {
  id: 'g1',
  number: 3,
  season: 2025,
  playedAt: '2025-05-10T17:00:00.000Z',
  status: 'published',
  teams: [],
  statistics: [],
};

describe('GameService', () => {
  let http: HttpTestingController;
  let service: GameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameService, provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(GameService);
  });

  afterEach(() => http.verify());

  it('find asks GET games with the filter and gives the games', () => {
    let result: unknown[] = [];
    service.find({ season: 2025 }).subscribe(games => (result = games));

    const request = http.expectOne(r => r.url === `${API}/games`);
    expect(request.request.params.get('season')).toBe('2025');
    request.flush(ok([game]));

    expect(result).toHaveLength(1);
    expect((result[0] as { id: string }).id).toBe('g1');
  });

  it('the dates of a game are Date, not the strings of the wire', () => {
    let list: { playedAt: unknown }[] = [];
    let one: { playedAt: unknown } | undefined;
    service.find({ season: 2025 }).subscribe(games => (list = games));
    http.expectOne(r => r.url === `${API}/games`).flush(ok([game]));
    service.findById('g1').subscribe(value => (one = value));
    http.expectOne(`${API}/games/g1`).flush(ok(game));

    expect(list[0].playedAt).toEqual(new Date('2025-05-10T17:00:00.000Z'));
    expect(one?.playedAt).toBeInstanceOf(Date);
  });

  it('findById asks GET games/:id', () => {
    let result: { id: string } | undefined;
    service.findById('g1').subscribe(value => (result = value as never));

    http.expectOne(`${API}/games/g1`).flush(ok(game));

    expect(result?.id).toBe('g1');
  });

  it('update PATCHes the game and gives it back (no second unwrap)', () => {
    let result: unknown;
    service.update('g1', game as never).subscribe(value => (result = value));

    const request = http.expectOne(`${API}/games/g1`);
    expect(request.request.method).toBe('PATCH');
    request.flush(ok(game));

    expect(result).toEqual(game);
  });

  it('create POSTs, replace PUTs, delete DELETEs', () => {
    service.create(game as never).subscribe();
    expect(http.expectOne(`${API}/games`).request.method).toBe('POST');

    service.replace('g1', game as never).subscribe();
    expect(http.expectOne(`${API}/games/g1`).request.method).toBe('PUT');

    service.delete('g1').subscribe();
    expect(http.expectOne(`${API}/games/g1`).request.method).toBe('DELETE');
  });
});
