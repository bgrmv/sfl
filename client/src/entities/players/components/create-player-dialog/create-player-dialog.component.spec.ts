import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { PlayersService } from '@entities/players/services/players.service';
import { HttpService } from '@shared/services/http.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePlayerDialogComponent } from './create-player-dialog.component';

describe('CreatePlayerDialogComponent', () => {
  let component: CreatePlayerDialogComponent;
  let fixture: ComponentFixture<CreatePlayerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePlayerDialogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), PlayersService, HttpService, { provide: MatDialogRef, useValue: { close: () => undefined } }],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreatePlayerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
