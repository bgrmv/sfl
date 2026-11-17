import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { PlayerChipComponent } from './player-chip.component';

@Component({
  imports: [PlayerChipComponent],
  template: `
    <sfl-player-chip
      id="linked"
      playerId="p1"
      name="Falcon"
      [number]="9"
      [bold]="true"
    >
      <span class="extra">Forward</span>
    </sfl-player-chip>
    <sfl-player-chip
      id="plain"
      name="Wolf"
    />
    <sfl-player-chip
      id="empty"
      name=""
      [number]="0"
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

describe('PlayerChipComponent', () => {
  it('shows initials, a link to the player page, the number and the projected line', () => {
    const el = render().querySelector('#linked') as HTMLElement;
    expect(el.textContent).toContain('FA');
    const link = el.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/players/p1');
    expect(link.querySelector('b')?.textContent).toBe('Falcon');
    expect(el.textContent).toContain('№ 9');
    expect(el.querySelector('.extra')?.textContent).toBe('Forward');
  });

  it('renders a name without a link when there is no player id', () => {
    const el = render().querySelector('#plain') as HTMLElement;
    expect(el.querySelector('a')).toBeNull();
    expect(el.textContent).toContain('Wolf');
    expect(el.textContent).toContain('WO');
    expect(el.textContent).not.toContain('№');
  });

  it('survives an empty name and a zero number', () => {
    const el = render().querySelector('#empty') as HTMLElement;
    expect(el.textContent).toContain('?');
    expect(el.textContent).not.toContain('№');
  });
});
