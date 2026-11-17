import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlayersService } from '../api/players.service';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlayersStore } from './players.store';

const player = (id: string, isCaptain = false) =>
  ({ id, nickname: id, isCaptain }) as never;

describe('PlayersStore', () => {
  const service = {
    find: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    anonymize: vi.fn(),
  };
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    service.find
      .mockReset()
      .mockReturnValue(of([player('a'), player('b', true)]));
    service.patch.mockReset();
    service.delete.mockReset();
    service.anonymize.mockReset();
    snackBar.open.mockReset();
    TestBed.configureTestingModule({
      providers: [
        PlayersStore,
        { provide: PlayersService, useValue: service },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads without artificial delay and has one source of truth (4, 7)', () => {
    const store = TestBed.inject(PlayersStore);

    expect(store.playersEntities().map(p => p.id)).toEqual(['a', 'b']);
    expect(store.loading()).toBe(false);
    expect(store.captains().map(p => p.id)).toEqual(['b']);
  });

  it('a failed load keeps the error and can be repeated (2, 6)', () => {
    service.find.mockReturnValueOnce(throwError(() => new Error('down')));
    const store = TestBed.inject(PlayersStore);

    expect(store.error()).toBeTruthy();
    expect(store.loading()).toBe(false);

    store.load();
    expect(store.error()).toBeNull();
    expect(store.playersEntities()).toHaveLength(2);
  });

  it('patch toggles the captain and the captains list follows (3)', () => {
    service.patch.mockReturnValue(of(player('a', true)));
    const store = TestBed.inject(PlayersStore);

    store.toggleCaptain('a');

    expect(service.patch).toHaveBeenCalledWith('a', { isCaptain: true });
    expect(
      store
        .captains()
        .map(p => p.id)
        .sort(),
    ).toEqual(['a', 'b']);
  });

  it('patch shows the error and leaves the state as it was (6)', () => {
    service.patch.mockReturnValue(throwError(() => new Error('boom')));
    const store = TestBed.inject(PlayersStore);

    store.toggleCaptain('a');

    expect(snackBar.open).toHaveBeenCalled();
    expect(store.captains().map(p => p.id)).toEqual(['b']);
    expect(store.loading()).toBe(false);
  });

  it('mutating stays true until the last of two parallel commands is done', () => {
    const first = new Subject<unknown>();
    const second = new Subject<unknown>();
    service.patch.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const store = TestBed.inject(PlayersStore);

    store.updateOne({ id: 'a', changes: { nickname: 'x' } });
    store.updateOne({ id: 'b', changes: { nickname: 'y' } });
    expect(store.mutating()).toBe(true);

    first.next({ id: 'a', nickname: 'x' });
    first.complete();
    expect(store.mutating()).toBe(true);

    second.next({ id: 'b', nickname: 'y' });
    second.complete();
    expect(store.mutating()).toBe(false);
  });

  it('a toggle reads the value of the store at its turn, not at the click', () => {
    const first = new Subject<unknown>();
    service.patch
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(of(player('a', false)));
    const store = TestBed.inject(PlayersStore);

    store.toggleCaptain('a');
    store.toggleCaptain('a');
    first.next(player('a', true));
    first.complete();

    expect(service.patch).toHaveBeenNthCalledWith(1, 'a', { isCaptain: true });
    expect(service.patch).toHaveBeenNthCalledWith(2, 'a', {
      isCaptain: false,
    });
    expect(store.playersEntityMap()['a'].isCaptain).toBe(false);
    expect(store.mutating()).toBe(false);
  });

  it('a second delete of the same player while the first runs is ignored', () => {
    const answer = new Subject<unknown>();
    service.delete.mockReturnValue(answer);
    const store = TestBed.inject(PlayersStore);

    store.deleteOne('a');
    store.deleteOne('a');

    expect(service.delete).toHaveBeenCalledTimes(1);
    answer.next({ id: 'a' });
    answer.complete();
    expect(store.mutating()).toBe(false);
  });

  it('updateOne sends the request and takes the answer (5)', () => {
    service.patch.mockReturnValue(of({ id: 'a', nickname: 'new' }));
    const store = TestBed.inject(PlayersStore);

    store.updateOne({ id: 'a', changes: { nickname: 'new' } });

    expect(service.patch).toHaveBeenCalledWith('a', { nickname: 'new' });
    expect(store.playersEntityMap()['a'].nickname).toBe('new');
  });

  it('deleteOne removes the player only after the server agrees (5)', () => {
    service.delete.mockReturnValueOnce(throwError(() => new Error('no')));
    const store = TestBed.inject(PlayersStore);

    store.deleteOne('a');
    expect(store.playersEntities()).toHaveLength(2);
    expect(snackBar.open).toHaveBeenCalled();

    service.delete.mockReturnValueOnce(of({ id: 'a' }));
    store.deleteOne('a');
    expect(store.playersEntities().map(p => p.id)).toEqual(['b']);
  });

  it('anonymizeOne takes the player without personal data from the server and says so (S8.4)', () => {
    service.anonymize.mockReturnValue(
      of({ id: 'a', nickname: 'Former player 7', user: { name: '' } }),
    );
    const store = TestBed.inject(PlayersStore);

    store.anonymizeOne('a');

    expect(service.anonymize).toHaveBeenCalledWith('a');
    expect(store.playersEntityMap()['a'].nickname).toBe('Former player 7');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Player anonymized',
      undefined,
      expect.anything(),
    );
  });

  it('anonymizeOne keeps the player as he was when the server refuses', () => {
    service.anonymize.mockReturnValue(throwError(() => new Error('no')));
    const store = TestBed.inject(PlayersStore);

    store.anonymizeOne('a');

    expect(store.playersEntityMap()['a'].nickname).toBe('a');
    expect(snackBar.open).toHaveBeenCalled();
  });
});
