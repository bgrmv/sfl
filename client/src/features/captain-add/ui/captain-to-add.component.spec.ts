import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PlayersService, PlayersStore } from '@entities/player';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaptainToAddComponent } from './captain-to-add.component';

describe('CaptainToAddComponent', () => {
  const patch = vi.fn();
  let fixture: ComponentFixture<CaptainToAddComponent>;

  beforeEach(async () => {
    patch.mockReset().mockReturnValue(of({ id: 'a', isCaptain: false }));
    await TestBed.configureTestingModule({
      imports: [CaptainToAddComponent],
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

    fixture = TestBed.createComponent(CaptainToAddComponent);
    fixture.detectChanges();
  });

  it('shows the captains of the league', () => {
    expect(fixture.componentInstance.captains().map(c => c.id)).toEqual(['a']);
  });

  it('a click on a captain card removes the captain through the players store', () => {
    const card = document.createElement('sfl-captain-card');
    card.setAttribute('data-captain-id', 'a');
    fixture.componentInstance.handleClick(card);

    expect(patch).toHaveBeenCalledWith('a', { isCaptain: false });
    expect(fixture.componentInstance.captains()).toHaveLength(0);
  });
});
