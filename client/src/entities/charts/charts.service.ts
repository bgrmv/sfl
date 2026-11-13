import { inject, Service } from '@angular/core';
import { HttpService } from '@shared/services/http.service';
import { map, Observable } from 'rxjs';

export type TTopTotalPoints = {
  id: string;
  nickname: string;
  user: {
    name?: string;
    surname?: string;
    email?: string;
  };
  totalPoints: number;
};

export type TTopAncientRatingSystem = {
  id: string;
  nickname: string;
  user: {
    name?: string;
    surname?: string;
    email?: string;
  };
  ancientRatingSystem: {
    plusMinus: number;
    lastResult: number;
    totalPoints: number;
  };
};

@Service({ autoProvided: false })
export class ChartsService {
  private readonly httpService = inject(HttpService);

  public getTopTotalPointsPlayers(filter: {
    season: number;
    limit?: number;
  }): Observable<TTopTotalPoints[]> {
    return this.httpService
      .get<
        TResponse<TTopTotalPoints[]>
      >(`charts/top-total-points-players`, filter)
      .pipe(map(({ data }) => data));
  }

  public getTopAncientRatingSystemPlayers(filter: {
    season: number;
    limit?: number;
  }): Observable<TTopAncientRatingSystem[]> {
    return this.httpService
      .get<
        TResponse<TTopAncientRatingSystem[]>
      >(`charts/top-ancient-rating-system-players`, filter)
      .pipe(map(({ data }) => data));
  }
}
