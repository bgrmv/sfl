import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { RatingCardComponent } from './rating-card.component';

@Component({
  imports: [RatingCardComponent],
  template: `
    <sfl-rating-card
      id="full"
      playerId="p1"
      name="Wolf"
      [rank]="2"
      value="412"
    >
      <span
        class="badge"
        card-badge
      >
        C
      </span>
      <span class="details">№ 4 · 79 days</span>
    </sfl-rating-card>
    <sfl-rating-card
      id="plain"
      name="Tank"
      [value]="0"
    />
    <sfl-rating-card
      id="empty"
      name=""
      value=""
    />
  `,
})
class HostComponent {}

function render(): HTMLElement {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RatingCardComponent', () => {
  it('shows the rank, a link, the value and both slots', () => {
    const full = render().querySelector('#full')!;
    expect(full.querySelector('.rank')?.textContent?.trim()).toBe('2.');
    expect(full.querySelector('a')?.getAttribute('href')).toBe('/players/p1');
    expect(full.querySelector('.value')?.textContent?.trim()).toBe('412');
    expect(full.querySelector('.badge')).toBeTruthy();
    expect(full.querySelector('.details')).toBeTruthy();
  });

  it('shows a zero value and no link or rank without them', () => {
    const plain = render().querySelector('#plain')!;
    expect(plain.querySelector('.value')?.textContent?.trim()).toBe('0');
    expect(plain.querySelector('a')).toBeNull();
    expect(plain.querySelector('.rank')).toBeNull();
  });

  it('does not collapse with empty values', () => {
    const empty = render().querySelector('#empty')!;
    expect(empty.querySelector('sfl-player-chip')).toBeTruthy();
    expect(empty.querySelector('.value')).toBeTruthy();
  });
});
