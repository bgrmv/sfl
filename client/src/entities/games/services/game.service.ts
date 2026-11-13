import { inject, Service } from '@angular/core';
import { HttpService } from '@shared/services/http.service';
import { map, Observable } from 'rxjs';
import { IGameDTO } from '../types';

@Service({ autoProvided: false })
export class GameService {
  private readonly httpService = inject(HttpService);

  public findById(id: string): Observable<IGameDTO> {
    return this.httpService.get<IGameDTO>(`games/${id}`);
  }

  public find(filter: Partial<IGameDTO> = {}): Observable<IGameDTO[]> {
    return this.httpService.get<IGameDTO[]>('games', filter);
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
