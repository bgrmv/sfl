import { TestBed } from '@angular/core/testing';
import { GameService } from '@entities/game';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameLease, PULSE_MS } from './game-lease';

const conflict = (message: string) =>
  throwError(() => ({ status: 409, code: 'CONFLICT', message }));

describe('GameLease (S10.54)', () => {
  const games = { lock: vi.fn(), unlock: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    games.lock.mockReset();
    games.unlock.mockReset().mockReturnValue(of(null));
    TestBed.configureTestingModule({
      providers: [GameLease, { provide: GameService, useValue: games }],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('takes the game at once and renews it with the pulse', () => {
    games.lock.mockReturnValue(
      of({ lock: { name: 'Admin', expiresAt: '2026-11-17T12:02:00.000Z' } }),
    );
    const lease = TestBed.inject(GameLease);

    lease.start('g1');
    expect(lease.state()).toBe('held');
    expect(lease.until()).toEqual(new Date('2026-11-17T12:02:00.000Z'));

    vi.advanceTimersByTime(PULSE_MS * 2);
    expect(games.lock).toHaveBeenCalledTimes(3);
  });

  it('a game of another editor is busy: the name and the time, no release at the end', () => {
    games.lock.mockReturnValue(
      conflict('Second is editing this game until 2026-11-17T12:05:00.000Z'),
    );
    const lease = TestBed.inject(GameLease);

    lease.start('g1');

    expect(lease.state()).toBe('busy');
    expect(lease.owner()).toBe('Second');
    expect(lease.until()).toEqual(new Date('2026-11-17T12:05:00.000Z'));
    lease.stop();
    expect(games.unlock).not.toHaveBeenCalled();
  });

  it('a game that is freed is taken by the pulse: busy turns to held', () => {
    games.lock
      .mockReturnValueOnce(conflict('Second is editing this game until x'))
      .mockReturnValue(
        of({ lock: { name: 'Me', expiresAt: '2026-11-17T12:09:00.000Z' } }),
      );
    const lease = TestBed.inject(GameLease);

    lease.start('g1');
    expect(lease.state()).toBe('busy');
    vi.advanceTimersByTime(PULSE_MS);

    expect(lease.state()).toBe('held');
    expect(lease.owner()).toBeNull();
  });

  it('stop releases a held game and stops the pulse; start of the same game twice asks once', () => {
    games.lock.mockReturnValue(
      of({ lock: { name: 'Me', expiresAt: '2026-11-17T12:09:00.000Z' } }),
    );
    const lease = TestBed.inject(GameLease);

    lease.start('g1');
    lease.start('g1');
    expect(games.lock).toHaveBeenCalledTimes(1);

    lease.stop();
    expect(games.unlock).toHaveBeenCalledWith('g1');
    expect(lease.state()).toBe('none');
    vi.advanceTimersByTime(PULSE_MS * 3);
    expect(games.lock).toHaveBeenCalledTimes(1);
  });

  it('another error of the server does not claim the game', () => {
    games.lock.mockReturnValue(
      throwError(() => ({ status: 500, code: 'INTERNAL_ERROR', message: 'x' })),
    );
    const lease = TestBed.inject(GameLease);

    lease.start('g1');

    expect(lease.state()).toBe('none');
  });
});
