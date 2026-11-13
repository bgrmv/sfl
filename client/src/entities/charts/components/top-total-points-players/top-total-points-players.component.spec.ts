import { provideHighcharts } from 'highcharts-angular';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopTotalPointsPlayersComponent } from './top-total-points-players.component';

describe('TopTotalPointsPlayersComponent', () => {
  let component: TopTotalPointsPlayersComponent;
  let fixture: ComponentFixture<TopTotalPointsPlayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopTotalPointsPlayersComponent],
      providers: [provideHighcharts({ instance: () => import('highcharts') })],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopTotalPointsPlayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
