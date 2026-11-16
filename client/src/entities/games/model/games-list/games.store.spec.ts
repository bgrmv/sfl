import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumGameStatus } from '../../constants';
import { GameService } from '../../services/game.service';
import { IGameDTO } from '../../types';
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
  const remove = vi.fn();
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    remove.mockReset().mockReturnValue(of({}));
    snackBar.open.mockReset();
    find.mockReset().mockReturnValue(of([played(1), played(3)]));
    TestBed.configureTestingModule({
      providers: [
        GamesStore,
        { provide: GameService, useValue: { find, delete: remove } },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
  });

  afterEach(() => {
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

    expect(store.loading()).toBe(false);

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

    const game = store.gamesEntities()[0];
    store.deleteGame(game);

    expect(remove).toHaveBeenCalledWith('real-1');

    const card = store.gamesEntities()[0];
    expect(card.id).toBe('game-card-2025-1');
    expect(card.status).toBe(EnumGameStatus.Furture);
    expect(card.statistics).toEqual([]);
  });

  it('a failed load keeps the error and the next season loads (2)', () => {
    find.mockReturnValueOnce(throwError(() => new Error('down')));
    const store = TestBed.inject(GamesStore);
    store.initGamesStore({ season: 2025 });

    expect(store.error()).toBeTruthy();
    expect(store.loading()).toBe(false);

    store.initGamesStore({ season: 2024 });
    expect(store.error()).toBeNull();
    expect(store.isFulfilled()).toBe(true);
  });

  it('a slow answer of the previous season does not overwrite the new one', () => {
    const slow = new Subject<IGameDTO[]>();
    find.mockReturnValueOnce(slow).mockReturnValueOnce(of([played(2)]));
    const store = TestBed.inject(GamesStore);

    store.initGamesStore({ season: 2024 });
    store.initGamesStore({ season: 2025 });
    slow.next([{ ...played(1), season: 2024 }]);

    expect(store.gamesEntities()[1].id).toBe('real-2');
    expect(store.gamesEntities().every(g => g.season === 2025)).toBe(true);
  });

  it('deleteGame keeps the game and shows the error when the server fails (11)', () => {
    const store = TestBed.inject(GamesStore);
    store.initGamesStore({ season: 2025 });
    remove.mockReturnValue(throwError(() => new Error('no')));

    store.deleteGame(store.gamesEntities()[0]);

    expect(store.gamesEntities()[0].id).toBe('real-1');
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('a second delete of the same game while the first runs is ignored', () => {
    const answer = new Subject<unknown>();
    remove.mockReturnValue(answer);
    const store = TestBed.inject(GamesStore);
    store.initGamesStore({ season: 2025 });
    const game = store.gamesEntities()[0];

    store.deleteGame(game);
    store.deleteGame(game);

    expect(remove).toHaveBeenCalledTimes(1);
    answer.next({});
    answer.complete();
    expect(store.gamesEntities()[0].id).toBe('game-card-2025-1');
  });
});
