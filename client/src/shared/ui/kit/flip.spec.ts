import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FlipDigitsComponent } from './flip';

@Component({
  imports: [FlipDigitsComponent],
  template: `
    <sfl-flip-digits
      [value]="value()"
      label="Score 4 to 1"
    />
  `,
})
class HostComponent {
  value = signal('4:1');
}

describe('sfl-flip-digits', () => {
  const setup = () => {
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    return f;
  };
  const tiles = (el: HTMLElement) =>
    [...el.querySelectorAll('.tile')].map(t => t.textContent?.trim());

  it('puts every digit on its own tile and keeps separators plain', () => {
    const el = setup().nativeElement as HTMLElement;
    expect(tiles(el)).toEqual(['4', '1']);
    expect(el.querySelector('.sep')?.textContent?.trim()).toBe(':');
  });

  it('is read as one value, the tiles are hidden from a screen reader', () => {
    const host = (setup().nativeElement as HTMLElement).querySelector(
      'sfl-flip-digits',
    )!;
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Score 4 to 1');
    expect(host.querySelector('.row')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('flips only the tile whose digit changed', () => {
    const f = setup();
    const el = f.nativeElement as HTMLElement;
    const before = [...el.querySelectorAll('.tile')];
    f.componentInstance.value.set('5:1');
    f.detectChanges();
    const after = [...el.querySelectorAll('.tile')];
    expect(tiles(el)).toEqual(['5', '1']);
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });
});
