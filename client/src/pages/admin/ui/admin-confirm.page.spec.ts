import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { GameService, GamesStore } from '@entities/game';
import { AuthService } from '@shared/auth/auth.service';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AdminConfirmPageComponent } from './admin-games.page';

const game = (over: Record<string, unknown>) => ({
  id: 'g1',
  number: 7,
  season: 2026,
  status: 'draft',
  playedAt: new Date(2026, 10, 14),
  metadata: { scoreFirstDraft: 4, scoreSecondDraft: 2 },
  confirmations: [],
  ...over,
});

function setup(games: unknown[], roles = ['ADMIN']) {
  const service = {
    confirm: vi.fn(() => of({})),
    unconfirm: vi.fn(() => of({})),
    revoke: vi.fn(() => of({})),
  };
  const store = {
    loading: signal(false),
    gamesEntities: signal(games),
    initGamesStore: vi.fn(),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
      {
        provide: AuthService,
        useValue: {
          user: signal({ id: 'me', email: 'a@b.c', roles }),
          isAdmin: signal(roles.includes('ADMIN')),
        },
      },
    ],
  });
  TestBed.overrideComponent(AdminConfirmPageComponent, {
    set: {
      providers: [
        { provide: GameService, useValue: service },
        { provide: GamesStore, useValue: store },
      ],
    },
  });
  const fixture = TestBed.createComponent(AdminConfirmPageComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll('button')].find(b =>
      b.textContent?.includes(label),
    ) as HTMLButtonElement | undefined;
  return { fixture, el, service, store, button };
}

describe('AdminConfirmPageComponent (S10.35)', () => {
  it('a draft shows its score, the confirmations and a button to confirm', () => {
    const { el, button } = setup([
      game({ confirmations: [{ accountId: 'other', at: 'x' }] }),
    ]);

    expect(el.textContent).toContain('Game 7');
    expect(el.textContent).toContain('4 : 2');
    expect(el.textContent).toContain('1 of 2 confirmations');
    expect(button('Confirm: the game is correct')).toBeTruthy();
    expect(button('Take my confirmation back')).toBeUndefined();
  });

  it('confirming calls the server and reloads the season', () => {
    const { fixture, service, store, button } = setup([game({})]);

    button('Confirm: the game is correct')!.click();
    fixture.detectChanges();

    expect(service.confirm).toHaveBeenCalledWith('g1');
    expect(store.initGamesStore).toHaveBeenCalled();
  });

  it('my own confirmation can be taken back, and cannot be given twice', () => {
    const { fixture, service, button } = setup([
      game({ confirmations: [{ accountId: 'me', at: 'x' }] }),
    ]);

    expect(button('Confirm: the game is correct')).toBeUndefined();
    button('Take my confirmation back')!.click();
    fixture.detectChanges();

    expect(service.unconfirm).toHaveBeenCalledWith('g1');
  });

  it('a revoke asks for a reason and sends it trimmed; the button waits for the reason', () => {
    const { fixture, el, service, button } = setup([
      game({ status: 'published' }),
    ]);

    button('Revoke publication')!.click();
    fixture.detectChanges();
    expect(
      (el.querySelector('form button[type="submit"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    const reason = el.querySelector('textarea') as HTMLTextAreaElement;
    reason.value = '  The score was wrong ';
    reason.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(service.revoke).toHaveBeenCalledWith('g1', 'The score was wrong');
  });

  it('a moderator confirms but has no revoke button; the revoked reason is shown on the draft', () => {
    const { el, button } = setup(
      [
        game({ status: 'published' }),
        game({
          id: 'g2',
          number: 8,
          revoked: { reason: 'Wrong score', at: 'x' },
        }),
      ],
      ['MODERATOR'],
    );

    expect(button('Revoke publication')).toBeUndefined();
    expect(el.textContent).toContain('Revoked: Wrong score');
  });

  it('says so when there is nothing to publish', () => {
    expect(setup([]).el.textContent).toContain('Nothing to publish');
  });
});
