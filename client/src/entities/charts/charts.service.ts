import { inject, Service } from '@angular/core';
import { HttpService } from '@shared/services/http.service';
import { Observable } from 'rxjs';

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
    return this.httpService.get<TTopTotalPoints[]>(
      `charts/top-total-points-players`,
      filter,
    );
  }

  public getTopAncientRatingSystemPlayers(filter: {
    season: number;
    limit?: number;
  }): Observable<TTopAncientRatingSystem[]> {
    return this.httpService.get<TTopAncientRatingSystem[]>(
      `charts/top-ancient-rating-system-players`,
      filter,
    );
  }
}
