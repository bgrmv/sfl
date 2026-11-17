import { TestBed } from '@angular/core/testing';
import type { MediaDTO } from '@sfl/schemas';
import { describe, expect, it } from 'vitest';
import { PhotoGridComponent } from './photo-grid.component';

const photo = (id: string, caption = ''): MediaDTO => ({
  id,
  mime: 'image/png',
  size: 10,
  caption,
});

function render(photos: MediaDTO[], empty?: string): HTMLElement {
  const fixture = TestBed.createComponent(PhotoGridComponent);
  fixture.componentRef.setInput('photos', photos);
  if (empty) fixture.componentRef.setInput('empty', empty);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PhotoGridComponent', () => {
  it('shows every photo by the address of its file, lazily, with the caption', () => {
    const el = render([photo('a1', 'The final'), photo('b2')]);

    const images = el.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute('src')).toMatch(/\/media\/a1\/file$/);
    expect(images[0].getAttribute('loading')).toBe('lazy');
    expect(images[0].getAttribute('alt')).toBe('The final');
    expect(el.querySelectorAll('figcaption')).toHaveLength(1);
  });

  it('a photo without a caption has the alt text "Photo" and no figcaption', () => {
    const el = render([photo('b2')]);

    expect(el.querySelector('img')?.getAttribute('alt')).toBe('Photo');
    expect(el.querySelector('figcaption')).toBeNull();
  });

  it('an empty list says so, with the text of the page', () => {
    expect(render([]).textContent).toContain('No photos yet.');
    expect(render([], 'No photos of this game.').textContent).toContain(
      'No photos of this game.',
    );
  });
});
