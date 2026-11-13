import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { PlayersStore } from '@entities/players/store/players.store';
import { PlayersService } from '@entities/players/services/players.service';
import { HttpService } from '@shared/services/http.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerCreateButtonComponent } from './player-create-button.component';

describe('PlayerCreateButtonComponent', () => {
  let component: PlayerCreateButtonComponent;
  let fixture: ComponentFixture<PlayerCreateButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCreateButtonComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), PlayersStore, PlayersService, HttpService],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlayerCreateButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
