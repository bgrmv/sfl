import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { GameService } from '@entities/game';
import { PlayersService } from '@entities/player';
import { TeamsService } from '@entities/team';
import { GameLease, NewGameStore } from '@features/game-edit';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AdminWizardPageComponent } from './admin-wizard.page';

const teams = [
  { id: 't1', name: 'BMW' },
  { id: 't2', name: 'HONDA' },
];
const players = ['a', 'b', 'c', 'd'].map((id, i) => ({
  id,
  nickname: `P-${id}`,
  number: i + 1,
  isCaptain: false,
}));
const saved = { id: 'g1', number: 3, season: 2026, playedAt: '2026-11-21' };

function setup(leaseState: 'none' | 'held' | 'busy' = 'none') {
  const games = {
    create: vi.fn<(game: unknown) => unknown>(() => of(saved)),
    update: vi.fn<(...args: unknown[]) => unknown>(() => of(saved)),
    find: vi.fn(),
  };
  const lease = {
    state: signal(leaseState),
    owner: signal<string | null>('Anna'),
    until: signal<Date | null>(null),
    start: vi.fn(),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
      { provide: TeamsService, useValue: { find: () => of(teams) } },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({})),
          queryParamMap: of(convertToParamMap({})),
        },
      },
    ],
  });
  TestBed.overrideComponent(AdminWizardPageComponent, {
    set: {
      providers: [
        NewGameStore,
        { provide: GameService, useValue: games },
        { provide: PlayersService, useValue: { find: () => of(players) } },
        { provide: GameLease, useValue: lease },
      ],
    },
  });
  const router = TestBed.inject(Router);
  Object.defineProperty(router, 'url', { get: () => '/admin/wizard' });
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(AdminWizardPageComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const store = fixture.debugElement.injector.get(NewGameStore);
  const click = (label: string) => {
    const b = [...el.querySelectorAll('button')].find(
      x =>
        x.textContent?.includes(label) ||
        x.getAttribute('aria-label') === label,
    ) as HTMLButtonElement;
    b.click();
    fixture.detectChanges();
  };
  const pick = (id: string, value: string) => {
    const select = el.querySelector(`#${id}`) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const type = (id: string, value: string) => {
    const input = el.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  return { fixture, el, store, games, lease, navigate, click, pick, type };
}

/** Both teams drafted: a, b in BMW (a captain), c, d in HONDA (c captain). */
function draft(w: ReturnType<typeof setup>) {
  w.click('3 · Draft');
  for (const [p, t] of [
    ['b', 'BMW'],
    ['d', 'HONDA'],
  ]) {
    w.click(`Add P-${p} to ${t}`);
  }
  w.click('2 · Captains');
  w.pick('wz-cap-t1', 'a');
  w.pick('wz-cap-t2', 'c');
}

describe('AdminWizardPageComponent (S10.67)', () => {
  it('shows six steps and moves between them', () => {
    const w = setup();

    expect(w.el.querySelectorAll('ol[aria-label="Steps"] li').length).toBe(6);
    w.click('Next:');
    expect(w.el.textContent).toContain('Captain');
    expect(w.el.querySelector('[aria-current="step"]')?.textContent).toContain(
      '2 · Captains',
    );
  });

  it('a captain chosen from all players gets a row and the badge; the draft adds the rest', () => {
    const w = setup();
    draft(w);

    const rows = w.store.statisticsEntities();
    expect(rows.map(r => `${r.teamId}:${r.playerId}`).sort()).toEqual([
      't1:a',
      't1:b',
      't2:c',
      't2:d',
    ]);
    expect(
      rows
        .filter(r => r.isCaptain)
        .map(r => r.playerId)
        .sort(),
    ).toEqual(['a', 'c']);
  });

  it('a goal added in the order sets the totals and the score', () => {
    const w = setup();
    draft(w);
    w.click('5 · Goal order');

    w.pick('wz-team', 't1');
    w.pick('wz-kind', 'head');
    w.pick('wz-author', 'a');
    w.pick('wz-pass-0', 'b');
    w.click('Add goal');

    const a = w.store.statisticsEntities().find(r => r.playerId === 'a')!;
    const b = w.store.statisticsEntities().find(r => r.playerId === 'b')!;
    expect(a.goalsByHead).toBe(1);
    expect(b.passes).toBe(1);
    expect(
      w.el.querySelector('ol[aria-label="Goals in order"]')?.textContent,
    ).toContain('1:0');
    expect(
      w.el.querySelector('[aria-label="Problems of the order"] li'),
    ).toBeNull();
  });

  it('moves and removes goals, the numbers follow', () => {
    const w = setup();
    draft(w);
    w.click('5 · Goal order');
    for (const [team, author] of [
      ['t1', 'a'],
      ['t2', 'c'],
    ]) {
      w.pick('wz-team', team);
      w.pick('wz-author', author);
      w.click('Add goal');
    }

    w.click('Move goal 2 up');
    expect(w.store.game().events!.map(e => e.authorId)).toEqual(['c', 'a']);
    expect(w.store.game().events!.map(e => e.n)).toEqual([1, 2]);

    w.click('Remove goal 1');
    expect(w.store.game().events).toHaveLength(1);
    expect(w.store.game().events![0]).toMatchObject({ n: 1, authorId: 'a' });
  });

  it('the review lists what is missing; the draft is saved when it is complete', () => {
    const w = setup();
    draft(w);
    w.click('6 · Review');
    const text = () => w.el.querySelector('[aria-label="Checks"]')!.textContent;

    expect(text()).toContain('✗ Every player has a position');
    expect(text()).toContain('✗ A game number and a season');
    const save = () =>
      [...w.el.querySelectorAll('button')].find(b =>
        b.textContent?.includes('Save draft'),
      ) as HTMLButtonElement;
    expect(save().disabled).toBe(true);

    w.click('1 · Game');
    w.type('wz-number', '3');
    w.type('wz-season', '2026');
    w.click('6 · Review');
    save().click();

    expect(w.games.create).toHaveBeenCalledTimes(1);
    expect(w.games.create.mock.calls[0][0]).toMatchObject({
      number: 3,
      season: 2026,
    });
    // The draft stays in the wizard
    expect(w.navigate).toHaveBeenCalledWith(['admin', 'wizard', 2026, 3]);
  });

  it('does not save while somebody else holds the lease, and tells who', () => {
    const w = setup('busy');
    w.click('6 · Review');

    expect(w.el.querySelector('[role="alert"]')?.textContent).toContain('Anna');
    const save = [...w.el.querySelectorAll('button')].find(b =>
      b.textContent?.includes('Save draft'),
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });
});
