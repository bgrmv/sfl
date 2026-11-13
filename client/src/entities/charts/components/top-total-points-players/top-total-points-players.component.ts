import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { ChartsService } from '@entities/charts/charts.service';
import Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { switchMap, take } from 'rxjs';

const LIMIT = 30;

const CHART_OPTIONS_DEFAULT = Object.freeze({
  chart: {
    type: 'column',
  },
  title: {
    text: undefined, //'Top players by total points',
    align: 'left',
  },
  // subtitle: {
  //   text: 'Top 20 players by total points',
  // },
  xAxis: {
    type: 'category',
    labels: {
      autoRotation: [-45, -90],
      style: {
        fontSize: '13px',
        fontFamily: 'Roboto, sans-serif',
      },
    },
    lineWidth: 0,
  },
  yAxis: {
    min: 0,
    title: {
      text: 'Rank (total points)',
    },
  },
  legend: {
    enabled: false,
  },
  tooltip: {
    pointFormat: '<b>{point.y}</b> total points',
  },
  series: [
    {
      name: 'Total points',
      colors: [
        '#9b20d9',
        '#9215ac',
        '#861ec9',
        '#7a17e6',
        '#7010f9',
        '#691af3',
        '#6225ed',
        '#5b30e7',
        '#533be1',
        '#4c46db',
        '#4551d5',
        '#3e5ccf',
        '#3667c9',
        '#2f72c3',
        '#277dbd',
        '#1f88b7',
        '#1693b1',
        '#0a9eaa',
        '#03c69b',
        '#00f194',
      ],
      colorByPoint: true,
      groupPadding: 0,
      data: [] as Array<[string, number]>,
      dataLabels: {
        enabled: true,
        // rotation: -90,
        color: '#FFFFFF',
        inside: true,
        verticalAlign: 'top',
        format: '{point.y}', // one decimal
        y: 10, // 10 pixels down from the top
        style: {
          fontSize: '13px',
          fontFamily: 'Roboto, sans-serif',
        },
      },
    },
  ],
});

@Component({
    selector: 'sfl-top-total-points-players',
    imports: [
        CommonModule,
        HighchartsChartModule,
        MatCardModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
    ],
    templateUrl: './top-total-points-players.component.html',
    styleUrl: './top-total-points-players.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ChartsService]
})
export class TopTotalPointsPlayersComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private chartsService = inject(ChartsService);

  protected readonly highcharts = Highcharts;
  protected readonly chartOptionsSignal = signal(CHART_OPTIONS_DEFAULT);

  protected readonly loading = signal<boolean>(true);
  protected readonly season = signal<number>(new Date().getFullYear());
  protected readonly seasons = signal<number[]>([]);

  protected readonly chartOptions$ = toObservable(this.season).pipe(
    switchMap(season => {
      return this.chartsService
        .getTopTotalPointsPlayers({ season, limit: LIMIT })
        .pipe(take(1));
    }),
    takeUntilDestroyed(this.destroyRef),
  );

  onSelect({ value }: MatSelectChange) {
    this.season.update(() => value);
  }

  ngOnInit(): void {
    for (let season = new Date().getFullYear(); season > 2010; season--) {
      this.seasons.update(seasons => [...seasons, season]);
    }

    this.chartOptions$.subscribe(data => {
      this.chartOptionsSignal.update(() => {
        const options = { ...CHART_OPTIONS_DEFAULT };
        options.series[0]['data'] = data.reduce(
          (acc, next) => {
            const fullName =
              `${next.user.name ?? ''} ${next.user.surname ?? ''}`.trim();
            const name = `${next.nickname} (${fullName})`;
            acc.push([name, next.totalPoints]);

            return acc;
          },
          [] as Array<[string, number]>,
        );

        return options;
      });
    });
  }
}
