import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PlayersService, PlayersStore } from '@entities/player';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaptainsTableComponent } from './captains-table.component';

describe('CaptainsTableComponent', () => {
  let fixture: ComponentFixture<CaptainsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaptainsTableComponent],
      providers: [
        provideNoopAnimations(),
        PlayersStore,
        {
          provide: PlayersService,
          useValue: {
            find: () =>
              of([
                { id: 'a', nickname: 'Bomber', isCaptain: true },
                { id: 'b', nickname: 'Wall', isCaptain: false },
              ]),
          },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CaptainsTableComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows one row per captain, not per player', () => {
    const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]');

    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Bomber');
  });
});
