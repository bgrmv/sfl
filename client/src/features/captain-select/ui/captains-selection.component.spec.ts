import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CaptainsStore } from '@entities/captain';
import { PlayersService, PlayersStore } from '@entities/player';
import { TeamEnum } from '@shared/constants/team';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaptainsSelectionComponent } from './captains-selection.component';

const player = (id: string, isCaptain: boolean) => ({
  id,
  nickname: id,
  isCaptain,
});

describe('CaptainsSelectionComponent', () => {
  let fixture: ComponentFixture<CaptainsSelectionComponent>;
  let component: CaptainsSelectionComponent;
  let control: FormControl<boolean | null>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaptainsSelectionComponent],
      providers: [
        provideNoopAnimations(),
        PlayersStore,
        CaptainsStore,
        {
          provide: PlayersService,
          useValue: {
            find: () =>
              of([player('a', true), player('b', true), player('c', false)]),
          },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    control = new FormControl<boolean | null>(false);
    fixture = TestBed.createComponent(CaptainsSelectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('team', TeamEnum.teamA);
    fixture.componentRef.setInput('control', control);
    fixture.detectChanges();
  });

  const click = (id: string) => {
    const card = document.createElement('sfl-captain-stats-card');
    card.setAttribute('data-captain-id', id);
    component.handleClick(card);
    fixture.detectChanges();
  };

  it('offers only the players who are captains', () => {
    expect(component.captains().map(c => c.id)).toEqual(['a', 'b']);
    expect(component.captainsWithoutTeam().map(c => c.id)).toEqual(['a', 'b']);
    expect(component.selectedCaptain()).toBeNull();
  });

  it('a click selects the captain for the team and marks the control', () => {
    click('a');

    expect(component.selectedCaptain()?.id).toBe('a');
    expect(component.captainsWithoutTeam().map(c => c.id)).toEqual(['b']);
    expect(control.value).toBe(true);
  });

  it('a second click replaces the captain of the team', () => {
    click('a');
    click('b');

    expect(component.selectedCaptain()?.id).toBe('b');
    expect(component.captainsWithoutTeam().map(c => c.id)).toEqual(['a']);
  });

  it('an id that is not a captain is ignored', () => {
    click('c');

    expect(component.selectedCaptain()).toBeNull();
  });

  it('reset frees the captain and clears the control', () => {
    click('a');
    component.deleteSelected('a');

    expect(component.selectedCaptain()).toBeNull();
    expect(component.captainsWithoutTeam()).toHaveLength(2);
    expect(control.value).toBe(false);
  });
});
