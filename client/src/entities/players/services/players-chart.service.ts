import { Injectable } from '@angular/core';
import { IPlayerDTO } from '@entities/games/types';

export type PlayersResponse = {
  players: IPlayerDTO[];
  page: number;
};

@Injectable()
export class PlayersChartService {
}
