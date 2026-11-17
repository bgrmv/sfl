import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PlayerHeaderComponent } from './player-header.component';

@Component({
  imports: [PlayerHeaderComponent],
  template: `
    <sfl-player-header
      id="big"
      name="Falcon"
      [size]="96"
      [accent]="true"
      [level]="1"
    >
      <span
        class="eyebrow"
        header-eyebrow
      >
        This is your player
      </span>
      <span class="fact">№ 9</span>
      <button
        class="aside"
        header-aside
      >
        Compare
      </button>
    </sfl-player-header>
    <sfl-player-header
      id="small"
      name="Wolf"
    />
    <sfl-player-header
      id="empty"
      name=""
    />
  `,
})
class HostComponent {}

function render(): HTMLElement {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PlayerHeaderComponent', () => {
  it('shows initials, the heading and the three slots', () => {
    const big = render().querySelector('#big')!;
    expect(big.querySelector('h1')?.textContent?.trim()).toBe('Falcon');
    expect(big.querySelector('sfl-avatar')?.textContent?.trim()).toBe('FA');
    expect(big.querySelector('.eyebrow')).toBeTruthy();
    expect(big.querySelector('.fact')?.textContent).toContain('№ 9');
    expect(big.querySelector('.aside')).toBeTruthy();
  });

  it('uses h2 by default and the 56 px avatar', () => {
    const small = render().querySelector('#small')!;
    expect(small.querySelector('h2')?.textContent?.trim()).toBe('Wolf');
    expect(small.querySelector('h1')).toBeNull();
    expect((small.querySelector('sfl-avatar') as HTMLElement).style.width).toBe(
      '56px',
    );
  });

  it('does not collapse with an empty name', () => {
    const empty = render().querySelector('#empty')!;
    expect(empty.querySelector('sfl-avatar')?.textContent?.trim()).toBe('?');
    expect(empty.querySelector('h2')).toBeTruthy();
  });
});
