import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { GameService } from '@entities/game';
import { PlayersService } from '@entities/player';
import { NewGameStore } from '@features/game-edit';
import { HttpService } from '@shared/services/http.service';
import { TeamPlayersAutocompleteComponent } from './team-players-autocomplete.component';

describe('TeamPlayersAutocompleteComponent', () => {
  let fixture: ComponentFixture<TeamPlayersAutocompleteComponent>;
  let store: InstanceType<typeof NewGameStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamPlayersAutocompleteComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        NewGameStore,
        PlayersService,
        GameService,
        HttpService,
      ],
    }).compileComponents();

    store = TestBed.inject(NewGameStore);
    // The component reads the first team of the store to pick its side
    store.initTeamsEntity([
      { id: 'team-1', name: 'BMW', color: 'blue' },
      { id: 'team-2', name: 'HONDA', color: 'red' },
    ] as never);
    store.addPlayer({ id: 'p1', nickname: 'Bomber', number: 9 } as never);

    fixture = TestBed.createComponent(TeamPlayersAutocompleteComponent);
    fixture.componentRef.setInput('teamId', 'team-1');
    fixture.detectChanges();
  });

  it('adds the picked player to the team and makes the first one captain', () => {
    const component = fixture.componentInstance as unknown as {
      pick(id: string): void;
      options(): { id: string; selected: boolean }[];
    };
    expect(component.options()).toEqual([
      expect.objectContaining({ id: 'p1', selected: false }),
    ]);

    component.pick('p1');

    expect(store.statisticsBMW()).toEqual([
      expect.objectContaining({
        playerId: 'p1',
        teamId: 'team-1',
        isCaptain: true,
      }),
    ]);
    expect(component.options()[0].selected).toBe(true);
  });
});
