import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GamesStore } from '@entities/game';
import { MediaService } from '@entities/media';
import { PlayersStore } from '@entities/player';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { MediaDTO } from '@sfl/schemas';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AdminMediaPageComponent } from './admin-media.page';

const photo = (id: string, caption = '', gameId?: string): MediaDTO => ({
  id,
  mime: 'image/png',
  size: 10,
  caption,
  gameId,
});

function setup(initial: MediaDTO[] = []) {
  const media = {
    find: vi.fn(() => of(initial)),
    upload: vi.fn((_file: File, fields: object) =>
      of({ ...photo('new', (fields as { caption: string }).caption) }),
    ),
    update: vi.fn((id: string, input: { caption: string }) =>
      of(photo(id, input.caption)),
    ),
    delete: vi.fn(() => of(null)),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: MatSnackBar, useValue: { open: vi.fn() } }],
  });
  TestBed.overrideComponent(AdminMediaPageComponent, {
    set: {
      providers: [
        { provide: MediaService, useValue: media },
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
  const fixture = TestBed.createComponent(AdminMediaPageComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, media };
}

describe('AdminMediaPageComponent', () => {
  it('lists the photos with their captions and links', () => {
    const { el } = setup([photo('a', 'The final', 'g1')]);

    expect(el.querySelectorAll('li img')).toHaveLength(1);
    expect((el.querySelector('li input') as HTMLInputElement).value).toBe(
      'The final',
    );
    expect(el.textContent).toContain('Game 3 · 2026');
  });

  it('with no photos it says so and the upload button is disabled', () => {
    const { el } = setup([]);

    expect(el.textContent).toContain('No photos yet');
    expect(
      (el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('uploads the chosen file with the caption and adds it to the top', () => {
    const { fixture, el, media } = setup([photo('a')]);
    const file = new File([new Uint8Array([1])], 'p.png', {
      type: 'image/png',
    });
    const input = el.querySelector('#media-file') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    const caption = el.querySelector('#media-caption') as HTMLInputElement;
    caption.value = 'New photo';
    caption.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(media.upload).toHaveBeenCalledWith(file, {
      caption: 'New photo',
      gameId: undefined,
      playerId: undefined,
    });
    expect(el.querySelectorAll('li')).toHaveLength(2);
    expect((el.querySelector('li input') as HTMLInputElement).value).toBe(
      'New photo',
    );
  });

  it('a file over the limit is not sent and the page says why', () => {
    const { fixture, el, media } = setup();
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png');
    const input = el.querySelector('#media-file') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [big] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(media.upload).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('5 MB');
  });

  it('saves a changed caption', () => {
    const { fixture, el, media } = setup([photo('a', 'Old')]);
    const input = el.querySelector('li input') as HTMLInputElement;
    input.value = 'Fresh';
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(media.update).toHaveBeenCalledWith('a', { caption: 'Fresh' });
  });

  it('deletes only after the second click', () => {
    const { fixture, el, media } = setup([photo('a')]);
    const buttons = () =>
      [...el.querySelectorAll('li button')] as HTMLButtonElement[];

    buttons()[0].click();
    fixture.detectChanges();
    expect(media.delete).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Delete for good');

    buttons()[0].click();
    fixture.detectChanges();
    expect(media.delete).toHaveBeenCalledWith('a');
    expect(el.querySelectorAll('li')).toHaveLength(0);
  });
});
