import { inject, Service } from '@angular/core';
import { IPlayerDTO, TPlayerFinal } from '../model/player';
import { playerSchema, playersSchema } from '@sfl/schemas';
import { checkedResponse } from '@shared/api/checked-response';
import { HttpService } from '@shared/services/http.service';
import { Observable, map } from 'rxjs';

export type PlayersResponse = {
  players: IPlayerDTO[];
  page: number;
};

@Service({ autoProvided: false })
export class PlayersService {
  #httpService = inject(HttpService);

  findOne(id: string): Observable<IPlayerDTO> {
    return this.#httpService.get<unknown>(`players/${id}`).pipe(
      checkedResponse(playerSchema, 'GET players/:id'),
      map(player => player as IPlayerDTO),
    );
  }

  find(ids?: string, includeMetadata = false): Observable<TPlayerFinal[]> {
    return this.#httpService
      .get<unknown, { ids?: string; includeMetadata: boolean }>('players', {
        ...(ids ? { ids } : {}),
        includeMetadata,
      })
      .pipe(
        checkedResponse(playersSchema, 'GET players'),
        map(players => players as TPlayerFinal[]),
      );
  }

  create(player: IPlayerDTO): Observable<IPlayerDTO[]> {
    return this.#httpService.post<
      SetOptional<IPlayerDTO, 'id' | 'isCaptain'>[],
      IPlayerDTO[]
    >('players', [player]);
  }

  public delete(id: string): Observable<IPlayerDTO | null> {
    return this.#httpService.delete<IPlayerDTO | null>(`players/${id}`);
  }

  getCaptainsPlayers(): Observable<IPlayerDTO[]> {
    return this.#httpService.get<unknown>('players/captains').pipe(
      checkedResponse(playersSchema, 'GET players/captains'),
      map(players => players as IPlayerDTO[]),
    );
  }

  patch(
    id: string,
    partialPlayer: Partial<IPlayerDTO>,
  ): Observable<IPlayerDTO | null> {
    return this.#httpService.patch<Partial<IPlayerDTO>, IPlayerDTO | null>(
      `players/${id}`,
      partialPlayer,
    );
  }
}
