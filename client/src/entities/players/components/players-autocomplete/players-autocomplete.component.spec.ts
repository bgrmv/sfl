import { EnumGameMode } from '@entities/games/constants';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { NewGameStore } from '@entities/games/store/new-game.store';
import { PlayersService } from '@entities/players/services/players.service';
import { GameService } from '@entities/games/services/game.service';
import { HttpService } from '@shared/services/http.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayersAutocompleteComponent } from './players-autocomplete.component';

describe('PlayersAutocompleteComponent', () => {
  let component: PlayersAutocompleteComponent;
  let fixture: ComponentFixture<PlayersAutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayersAutocompleteComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), NewGameStore, PlayersService, GameService, HttpService],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlayersAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', EnumGameMode.Create);
    fixture.componentRef.setInput('teamId', 'team-1');
    fixture.detectChanges();
  });

  // TODO(S2.5): компоненту нужен NewGameStore с двумя командами (teamsEntities().at(0)!.id)
  it.skip('should create', () => {
    expect(component).toBeTruthy();
  });
});
