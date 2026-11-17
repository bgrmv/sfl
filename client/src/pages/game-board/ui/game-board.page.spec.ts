import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { CommentsService } from '@entities/comment';
import { GameService, GamesStore } from '@entities/game';
import { MediaService } from '@entities/media';
import { PlayersService, PlayersStore } from '@entities/player';
import { AuthService } from '@shared/auth/auth.service';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { GameBoardPageComponent } from './game-board.page';

const stat = (playerId: string, teamId: string, over = {}) => ({
  playerId,
  teamId,
  goalsByLeg: 0,
  goalsByHead: 0,
  goalsByPenalty: 0,
  goalsByAuto: 0,
  passes: 0,
  isCaptain: false,
  isMVP: false,
  isTransfer: false,
  position: 'MID',
  ...over,
});

const game = (events?: unknown[]) => ({
  id: 'g1',
  number: 7,
  season: 2026,
  status: 'published',
  playedAt: new Date(2026, 10, 14),
  description: '',
  teams: [
    { id: 'T1', name: 'BMW' },
    { id: 'T2', name: 'HONDA' },
  ],
  statistics: [
    stat('a', 'T1', { goalsByHead: 1, goalsByLeg: 1, isCaptain: true }),
    stat('b', 'T1', { passes: 1 }),
    stat('c', 'T1', { passes: 1 }),
    stat('x', 'T2', { goalsByPenalty: 1, isCaptain: true }),
  ],
  metadata: {
    scoreFirstDraft: 3,
    scoreSecondDraft: 1,
    captainFirstDraft: 'a',
    captainSecondDraft: 'x',
    mvpListIds: [],
  },
  ...(events ? { events } : {}),
});

function render(g: ReturnType<typeof game>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
      { provide: AuthService, useValue: { isAdmin: signal(false) } },
    ],
  });
  TestBed.overrideComponent(GameBoardPageComponent, {
    set: {
      providers: [
        { provide: GameService, useValue: {} },
        {
          provide: GamesStore,
          useValue: {
            loading: signal(false),
            initGamesStore: vi.fn(),
            gamesEntities: signal([g]),
          },
        },
        { provide: PlayersService, useValue: {} },
        {
          provide: PlayersStore,
          useValue: {
            loading: signal(false),
            playersEntities: signal(
              ['a', 'b', 'c', 'x'].map(id => ({
                id,
                nickname: id.toUpperCase(),
              })),
            ),
          },
        },
        { provide: MediaService, useValue: { find: () => of([]) } },
        { provide: CommentsService, useValue: { find: () => of([]) } },
      ],
    },
  });
  const fixture = TestBed.createComponent(GameBoardPageComponent);
  fixture.componentRef.setInput('season', '2026');
  fixture.componentRef.setInput('number', '7');
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('GameBoardPageComponent: the goals', () => {
  it('shows the goals in the order they were scored, with the score after each and the weight of the pass', () => {
    const el = render(
      game([
        { n: 1, kind: 'head', teamId: 'T1', authorId: 'a', assistIds: ['b'] },
        { n: 2, kind: 'penalty', teamId: 'T2', authorId: 'x', assistIds: [] },
        { n: 3, kind: 'goal', teamId: 'T1', authorId: 'a', assistIds: ['c'] },
      ]),
    );

    const rows = [
      ...el.querySelectorAll(
        'ol[aria-label="Goals in the order they were scored"] li',
      ),
    ].map(li => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(rows).toEqual([
      '2 : 0BMW A · header · pass B (+2)',
      '2 : 1HONDA X · penalty',
      '3 : 1BMW A · goal · pass C',
    ]);
    expect(el.textContent).not.toContain('The order of goals is not recorded');
  });

  it('a game without the order shows the scorers and says the order is not recorded', () => {
    const el = render(game());

    expect(
      el.querySelector('ol[aria-label="Goals in the order they were scored"]'),
    ).toBeNull();
    expect(el.textContent).toContain('The order of goals is not recorded');
    expect(el.textContent).toContain('1 goal · 1 header');
  });
});
