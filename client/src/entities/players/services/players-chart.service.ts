import { Injectable, inject } from '@angular/core';
import { IPlayerDTO } from '@entities/games/types';
import { HttpService } from '@shared/services/http.service';

export type PlayersResponse = {
  players: IPlayerDTO[];
  page: number;
};

@Injectable()
export class PlayersChartService {
  #httpService = inject(HttpService);
}
