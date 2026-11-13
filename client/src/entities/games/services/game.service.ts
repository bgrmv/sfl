import { inject, Service } from '@angular/core';
import { gameSchema, gamesSchema } from '@sfl/schemas';
import { checkedResponse } from '@shared/api/checked-response';
import { HttpService } from '@shared/services/http.service';
import { map, Observable } from 'rxjs';
import { IGameDTO } from '../types';

// The response is checked against the shared schema; the client keeps the dates
// of a game as Date (see IGameDTO), so the checked data is typed accordingly
const asGame = map((game: unknown) => game as IGameDTO);
const asGames = map((games: unknown) => games as IGameDTO[]);

@Service({ autoProvided: false })
export class GameService {
  private readonly httpService = inject(HttpService);

  public findById(id: string): Observable<IGameDTO> {
    return this.httpService
      .get<unknown>(`games/${id}`)
      .pipe(checkedResponse(gameSchema, 'GET games/:id'), asGame);
  }

  public find(filter: Partial<IGameDTO> = {}): Observable<IGameDTO[]> {
    return this.httpService
      .get<unknown>('games', filter)
      .pipe(checkedResponse(gamesSchema, 'GET games'), asGames);
  }

  public create(game: IGameDTO) {
    return this.httpService.post<IGameDTO>(`games`, game);
  }

  public update(id: string, game: IGameDTO): Observable<IGameDTO> {
    return this.httpService
      .patch<IGameDTO, TResponse<IGameDTO>>(`games/${id}`, game)
      .pipe(map(({ data }) => data));
  }

  public replace(id: string, game: IGameDTO) {
    return this.httpService.put<IGameDTO>(`games/${id}`, game);
  }

  public delete(id: string) {
    return this.httpService.delete<IGameDTO>(`games/${id}`);
  }
}
