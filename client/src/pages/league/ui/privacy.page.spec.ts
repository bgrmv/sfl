import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PrivacyPageComponent } from './privacy.page';

describe('PrivacyPageComponent', () => {
  it('says what is kept and how to leave, and keeps the statistics', () => {
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('What we keep');
    expect(text).toContain('Leaving or correcting');
    expect(text).toContain('Former player');
    expect(text).toContain('The games you played');
    expect(text).toContain('no requests to');
  });
});
