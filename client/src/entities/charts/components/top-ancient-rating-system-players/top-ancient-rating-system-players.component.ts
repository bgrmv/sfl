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
import {
  ChartsService,
  TTopAncientRatingSystem,
} from '@entities/charts/charts.service';

import { HighchartsChartModule } from 'highcharts-angular';
import Highcharts from 'highcharts/es-modules/masters/highcharts.src';
import { switchMap, take } from 'rxjs';

const LIMIT = 30;

const CHART_OPTIONS_DEFAULT = {
  chart: {
    type: 'bar',
  },
  title: {
    text: undefined, // 'Top plus / minus & last result players',
    align: 'left',
  },
  subtitle: {
    align: 'left',
  },
  xAxis: {
    categories: [] as string[],
    title: {
      text: null,
    },
    gridLineWidth: 1,
    lineWidth: 0,
  },
  yAxis: {
    title: {
      text: 'Points',
      align: 'high',
    },
    labels: {
      overflow: 'justify',
    },
    gridLineWidth: 0,
  },
  tooltip: {
    valueSuffix: ' points',
  },
  plotOptions: {
    bar: {
      borderRadius: 5,
      dataLabels: {
        enabled: true,
      },
      // groupPadding: 0.1,
      groupPadding: 0.1, // Increased the space between groups of bars
      pointPadding: 0, // Increased the space between individual bars in a group
    },
  },
  legend: {
    layout: 'horizontal',
    align: 'center',
    verticalAlign: 'bottom',
    x: 0,
    y: 20,
    floating: true,
    borderWidth: 0,
    shadow: false,
  },
  credits: {
    enabled: true,
  },
  series: [{ type: 'bar' }, { type: 'bar' }] as Highcharts.SeriesOptionsType[],
} as Highcharts.Options;

@Component({
  selector: 'sfl-top-ancient-rating-system-players',
  imports: [
    HighchartsChartModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './top-ancient-rating-system-players.component.html',
  styleUrl: './top-ancient-rating-system-players.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ChartsService],
})
export class TopAncientRatingSystemPlayersComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private chartsService = inject(ChartsService);

  protected readonly highcharts = Highcharts;
  protected readonly chartOptionsSignal = signal(CHART_OPTIONS_DEFAULT);

  protected readonly season = signal<number>(new Date().getFullYear());
  protected readonly seasons = signal<number[]>([]);

  protected readonly chartOptions$ = toObservable(this.season).pipe(
    switchMap(season => {
      return this.chartsService
        .getTopAncientRatingSystemPlayers({ season, limit: LIMIT })
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

    this.chartOptions$.subscribe(players => {
      const nicknames = players.map(players => {
        if (players.user.name || players.user.surname) {
          const fullName =
            `${players.user.name ?? ''} ${players.user.surname ?? ''}`.trim();
          return `${players.nickname} (${fullName})`;
        }
        return players.nickname;
      });
      const series = this.mapDataToSeries(players);

      this.chartOptionsSignal.update(() => ({
        ...CHART_OPTIONS_DEFAULT,
        xAxis: {
          ...CHART_OPTIONS_DEFAULT.xAxis,
          categories: nicknames,
        },
        series,
      }));
    });
  }

  public mapDataToSeries(
    players: TTopAncientRatingSystem[],
  ): Highcharts.SeriesOptionsType[] {
    // Extracting the data for each series
    const plusMinusData = players.map(
      player => player.ancientRatingSystem.plusMinus,
    );
    const lastResultData = players.map(
      player => player.ancientRatingSystem.lastResult,
    );

    // Mapping each data series into Highcharts format
    return [
      {
        type: 'bar',
        visible: true,
        name: 'Plus / Minus (+/-)',
        data: plusMinusData,
      },
      {
        type: 'bar',
        visible: true,
        name: 'Last result (lr)',
        data: lastResultData,
        description: 'Last result (lr)',
        labels: {},
      },
    ] as Highcharts.SeriesOptionsType[];
  }
}
