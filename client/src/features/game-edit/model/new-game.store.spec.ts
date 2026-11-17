import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { PlayersService } from '@entities/player';
import { TeamsService } from '@entities/team';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumGameMode } from './game-mode';
import { GameService } from '@entities/game';
import { NewGameStore } from './new-game.store';

const teams = [
  { id: 't1', name: 'BMW' },
  { id: 't2', name: 'HONDA' },
];

describe('NewGameStore', () => {
  const gameService = {
    find: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const teamsService = { find: vi.fn() };
  const playersService = { find: vi.fn() };
  const router = { navigate: vi.fn() };
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    gameService.find.mockReset();
    gameService.create.mockReset();
    gameService.update.mockReset();
    teamsService.find.mockReset().mockReturnValue(of(teams));
    playersService.find.mockReset().mockReturnValue(of([]));
    router.navigate.mockReset();
    snackBar.open.mockReset();

    TestBed.configureTestingModule({
      providers: [
        NewGameStore,
        { provide: GameService, useValue: gameService },
        { provide: TeamsService, useValue: teamsService },
        { provide: PlayersService, useValue: playersService },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('opens in the create mode without an artificial delay (7)', () => {
    const store = TestBed.inject(NewGameStore);

    expect(store.mode()).toBe(EnumGameMode.Create);
    expect(store.loading()).toBe(false);
  });

  it('a failed load does not kill initGame: the next call works (1)', () => {
    teamsService.find.mockReturnValueOnce(throwError(() => new Error('down')));
    const store = TestBed.inject(NewGameStore);

    expect(store.mode()).toBe(EnumGameMode.Unknown);
    expect(store.loading()).toBe(false);

    store.initGame();
    expect(store.mode()).toBe(EnumGameMode.Create);
  });

  it('a second save while the first runs sends one request (8)', () => {
    const answer = new Subject<unknown>();
    gameService.create.mockReturnValue(answer);
    const store = TestBed.inject(NewGameStore);

    store.saveGame();
    store.saveGame();
    expect(gameService.create).toHaveBeenCalledTimes(1);
    expect(store.saving()).toBe(true);

    // An HTTP request answers once and completes
    answer.next({ season: 2026, number: 3 });
    answer.complete();
    expect(store.saving()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['games', 'edit', 2026, 3]);
  });

  it('a failed save shows the error and unlocks the button (8)', () => {
    gameService.create.mockReturnValue(throwError(() => new Error('no')));
    const store = TestBed.inject(NewGameStore);

    store.saveGame();

    expect(snackBar.open).toHaveBeenCalled();
    expect(store.saving()).toBe(false);
  });

  it('updateGame takes the answer of the server without a reload (9)', () => {
    gameService.update.mockReturnValue(
      of({
        id: 'g1',
        number: 4,
        season: 2026,
        playedAt: '2026-01-03',
        notes: null,
      }),
    );
    const store = TestBed.inject(NewGameStore);
    const loads = teamsService.find.mock.calls.length;

    store.updateGame();

    expect(teamsService.find.mock.calls.length).toBe(loads);
    expect(store.game().number).toBe(4);
    expect(store.game().notes).toEqual(['', '']);
    expect(store.initialValue()?.number).toBe(4);
    expect(store.saving()).toBe(false);
  });

  it('a game that is not found: mode Unknown and the user is told (5)', () => {
    gameService.find.mockReturnValue(of([]));
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({ season: '2026', number: '9' })),
        queryParamMap: of(convertToParamMap({})),
      },
    });

    const store = TestBed.inject(NewGameStore);

    expect(store.mode()).toBe(EnumGameMode.Unknown);
    expect(store.loading()).toBe(false);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Game not found',
      'Close',
      expect.anything(),
    );
  });

  it('opens with empty teams without an exception', () => {
    teamsService.find.mockReturnValue(of([]));
    const store = TestBed.inject(NewGameStore);

    expect(store.mode()).toBe(EnumGameMode.Create);
    expect(store.isFormChanged()).toBe(false);
  });

  it('the errors of the form follow the data at once, they are not stored', () => {
    const store = TestBed.inject(NewGameStore);

    expect(store.errors().size).toBeGreaterThan(0);
    expect(store.errors().has('statistics:teamA:atleastOne')).toBe(true);
  });

  it('the order of the goals sets the totals of the players and is sent with the game (S10.67)', () => {
    gameService.update.mockReturnValue(
      of({ id: 'g1', number: 1, season: 2026 }),
    );
    const store = TestBed.inject(NewGameStore);
    store.updateGameFields({ id: 'g1' });
    store.initEntityStatistics([
      {
        id: 't1~a',
        playerId: 'a',
        teamId: 't1',
        goalsByLeg: 5,
        goalsByHead: 0,
        goalsByPenalty: 0,
        goalsByAuto: 0,
        passes: 5,
        isMVP: false,
        isCaptain: true,
        isTransfer: false,
        position: null,
      } as never,
    ]);
    const events = [
      {
        n: 1,
        kind: 'head' as const,
        teamId: 't1',
        authorId: 'a',
        assistIds: [],
      },
    ];

    store.setEvents(events);
    store.updateGame();

    expect(store.statisticsEntities()[0]).toMatchObject({
      goalsByLeg: 0,
      goalsByHead: 1,
      passes: 0,
    });
    expect(gameService.update.mock.calls[0][1].events).toEqual(events);
  });
});
