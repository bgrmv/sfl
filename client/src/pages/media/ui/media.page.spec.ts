import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GamesStore } from '@entities/game';
import { MediaService } from '@entities/media';
import { PlayersStore } from '@entities/player';
import type { MediaDTO } from '@sfl/schemas';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { MediaPageComponent } from './media.page';

const photo = (id: string): MediaDTO => ({
  id,
  mime: 'image/png',
  size: 1,
  caption: `Photo ${id}`,
});
const page = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => photo(String(from + i)));

function setup(pages: MediaDTO[][]) {
  const find = vi.fn();
  pages.forEach(p => find.mockReturnValueOnce(of(p)));
  find.mockReturnValue(of([]));
  TestBed.configureTestingModule({
    providers: [{ provide: MatSnackBar, useValue: { open: vi.fn() } }],
  });
  TestBed.overrideComponent(MediaPageComponent, {
    set: {
      providers: [
        { provide: MediaService, useValue: { find } },
        {
          provide: GamesStore,
          useValue: {
            initGamesStore: vi.fn(),
            gamesEntities: signal([
              { id: 'g1', number: 3, season: 2026, status: 'published' },
            ]),
          },
        },
        {
          provide: PlayersStore,
          useValue: {
            playersEntities: signal([{ id: 'p1', nickname: 'Falcon' }]),
          },
        },
      ],
    },
  });
  const fixture = TestBed.createComponent(MediaPageComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, find };
}

const choose = (el: HTMLElement, id: string, value: string) => {
  const select = el.querySelector(`#${id}`) as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('change'));
};

describe('MediaPageComponent (the photos of the league)', () => {
  it('shows the first page, the newest first, without the button when the page is short', () => {
    const { el, find } = setup([page(1, 3)]);

    expect(find).toHaveBeenCalledWith({ limit: 24, offset: 0 });
    expect(el.querySelectorAll('img')).toHaveLength(3);
    expect(el.textContent).not.toContain('Show more');
  });

  it('a full page offers "Show more" and the next page is appended', () => {
    const { fixture, el, find } = setup([page(1, 24), page(25, 2)]);
    expect(el.textContent).toContain('Show more');

    (
      [...el.querySelectorAll('button')].find(b =>
        b.textContent?.includes('Show more'),
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(find).toHaveBeenLastCalledWith({ limit: 24, offset: 24 });
    expect(el.querySelectorAll('img')).toHaveLength(26);
    expect(el.textContent).not.toContain('Show more');
  });

  it('a player and a game narrow the list and start from the first page', () => {
    const { fixture, el, find } = setup([
      page(1, 24),
      page(50, 1),
      page(60, 1),
    ]);

    choose(el, 'media-player', 'p1');
    fixture.detectChanges();
    expect(find).toHaveBeenLastCalledWith({
      playerId: 'p1',
      limit: 24,
      offset: 0,
    });

    choose(el, 'media-season', '2026');
    fixture.detectChanges();
    choose(el, 'media-game', 'g1');
    fixture.detectChanges();
    expect(find).toHaveBeenLastCalledWith({
      gameId: 'g1',
      playerId: 'p1',
      limit: 24,
      offset: 0,
    });
  });

  it('says so when nothing is found, and the game choice waits for a season', () => {
    const { el } = setup([[]]);

    expect(el.textContent).toContain('No photos for this choice.');
    expect(
      (el.querySelector('#media-game') as HTMLSelectElement).disabled,
    ).toBe(true);
  });
});
