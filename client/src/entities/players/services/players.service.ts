import { inject, Service } from '@angular/core';
import { IPlayerDTO, TPlayerFinal } from '@entities/games/types';
import { HttpService } from '@shared/services/http.service';
import { Observable, firstValueFrom } from 'rxjs';

type ResponseCaptains = {
  players: IPlayerDTO[];
  page: number;
};

export type PlayersResponse = {
  players: IPlayerDTO[];
  page: number;
};

@Service({ autoProvided: false })
export class PlayersService {
  #httpService = inject(HttpService);

  findOne(id: string): Observable<IPlayerDTO> {
    return this.#httpService.get<TPlayerFinal>(`players/${id}`);
  }

  find(ids?: string, includeMetadata = false): Observable<TPlayerFinal[]> {
    return this.#httpService.get<
      TPlayerFinal[],
      { ids?: string; includeMetadata: boolean }
    >('players', {
      ...(ids ? { ids } : {}),
      includeMetadata,
    });
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
    return this.#httpService.get<IPlayerDTO[]>('players/captains');
  }

  async getList(page: number = 0): Promise<ResponseCaptains> {
    const data = await firstValueFrom(
      this.#httpService.post<ResponseCaptains>('players/list', { page }),
    );

    return {
      players: data?.players ?? [],
      page: data.page ?? 0,
    };
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
