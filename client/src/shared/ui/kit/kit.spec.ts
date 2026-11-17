import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import {
  FEATURES,
  FEATURE_FLAGS,
  SHOW_DUMMY_MARKERS,
  type FeatureKey,
} from '@shared/config/feature-flags';
import { KIT } from './index';

@Component({
  imports: [...KIT],
  template: `
    <div
      *sflFeature="'home.vote'"
      id="on"
    >
      vote block
    </div>
    <div
      *sflFeature="'admin.media'"
      id="off"
    >
      media block
    </div>
    <sfl-card
      flag="home.vote"
      title="Vote"
    >
      body
    </sfl-card>
    <sfl-form-dots form="WDL" />
    <sfl-bars [bars]="[{ v: 2 }, { v: 4, win: true }]" />
  `,
})
class HostComponent {}

function render(flags: Record<string, unknown>, markers = true) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: FEATURE_FLAGS, useValue: flags },
      { provide: SHOW_DUMMY_MARKERS, useValue: markers },
    ],
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('feature flags registry', () => {
  it('every dummy block says what real data it still needs', () => {
    for (const [key, flag] of Object.entries(FEATURES)) {
      if (flag.dummy) {
        expect(flag.needs.length, key).toBeGreaterThan(0);
      }
    }
  });

  it('every block of the design is enabled by default', () => {
    expect(Object.values(FEATURES).every(flag => flag.enabled)).toBe(true);
  });
});

describe('sflFeature and kit', () => {
  const flags = {
    ...FEATURES,
    'admin.media': { enabled: false, dummy: true, needs: 'x' },
  } as Record<FeatureKey, unknown>;

  it('renders a block only when its flag is enabled', () => {
    const el = render(flags);
    expect(el.querySelector('#on')).not.toBeNull();
    expect(el.querySelector('#off')).toBeNull();
  });

  it('marks a dummy block with a ribbon and its data attribute', () => {
    const el = render(flags);
    expect(el.querySelector('.dummy')?.textContent).toContain('dummy');
    expect(el.querySelector('[data-dummy="home.vote"]')).not.toBeNull();
  });

  it('hides the ribbon outside dev mode', () => {
    const el = render(flags, false);
    expect(el.querySelector('.dummy')).toBeNull();
  });

  it('shows the form as letters and keeps a text alternative', () => {
    const el = render(flags);
    const dots = el.querySelector('sfl-form-dots') as HTMLElement;
    expect(dots.textContent?.replace(/\s/g, '')).toBe('WDL');
    expect(dots.getAttribute('aria-label')).toBe('Form: WDL');
  });

  it('gives a chart a text alternative', () => {
    const el = render(flags);
    expect(
      el.querySelector('sfl-bars [role="img"]')?.getAttribute('aria-label'),
    ).toBe('Bar chart');
  });
});
