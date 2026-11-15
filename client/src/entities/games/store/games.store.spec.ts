import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumGameStatus } from '../constants';
import { GameService } from '../services/game.service';
import { IGameDTO } from '../types';
import { GamesStore } from './games.store';

const played = (number: number): IGameDTO =>
  ({
    id: `real-${number}`,
    number,
    season: 2025,
    playedAt: new Date('2025-01-04T17:00:00Z'),
    status: EnumGameStatus.Published,
    teams: [],
    statistics: [],
  }) as unknown as IGameDTO;

describe('GamesStore', () => {
  const find = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    find.mockReset().mockReturnValue(of([played(1), played(3)]));
    TestBed.configureTestingModule({
      providers: [GamesStore, { provide: GameService, useValue: { find } }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts idle in the current season', () => {
    const store = TestBed.inject(GamesStore);

    expect(store.season()).toBe(new Date().getFullYear());
    expect(store.loading()).toBe(false);
    expect(store.isPending()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('updateSeason changes the season', () => {
    const store = TestBed.inject(GamesStore);
    store.updateSeason(2024);

    expect(store.season()).toBe(2024);
  });

  it('initGamesStore loads the season and fills every week with a card', () => {
    const store = TestBed.inject(GamesStore);
    store.initGamesStore({ season: 2025 });

    expect(store.loading()).toBe(true);
    vi.advanceTimersByTime(500);

    expect(find).toHaveBeenCalledWith({ season: 2025 });
    expect(store.loading()).toBe(false);

    const games = store.gamesEntities();
    expect(games.length).toBeGreaterThanOrEqual(52);
    expect(games[0].id).toBe('real-1');
    expect(games[1].id).toBe('game-card-2025-2');
    expect(games[1].status).toBe(EnumGameStatus.Furture);
    expect(games[2].id).toBe('real-3');
  });

  it('deleteGame turns a played game back into a placeholder card', () => {
    const store = TestBed.inject(GamesStore);
    store.initGamesStore({ season: 2025 });
    vi.advanceTimersByTime(500);

    const game = store.gamesEntities()[0];
    store.deleteGame(game);

    const card = store.gamesEntities()[0];
    expect(card.id).toBe('game-card-2025-1');
    expect(card.status).toBe(EnumGameStatus.Furture);
    expect(card.statistics).toEqual([]);
  });
});
