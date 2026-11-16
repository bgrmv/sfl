import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PlayersService, PlayersStore } from '@entities/player';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaptainsToggleComponent } from './captains-toggle.component';

describe('CaptainsToggleComponent', () => {
  const patch = vi.fn();
  let fixture: ComponentFixture<CaptainsToggleComponent>;

  beforeEach(async () => {
    patch.mockReset().mockReturnValue(of({ id: 'a', isCaptain: false }));
    await TestBed.configureTestingModule({
      imports: [CaptainsToggleComponent],
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
            patch,
          },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CaptainsToggleComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('lists the captains', () => {
    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]')).toHaveLength(
      1,
    );
  });

  it('a toggle changes the player once, in the players store', () => {
    fixture.componentInstance.onToggle('a');

    expect(patch).toHaveBeenCalledWith('a', { isCaptain: false });
    const players = TestBed.inject(PlayersStore);
    expect(players.captains()).toHaveLength(0);
  });
});
