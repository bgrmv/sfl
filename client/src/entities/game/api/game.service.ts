import { inject, Service } from '@angular/core';
import { gameSchema, gamesSchema } from '@sfl/schemas';
import { checkedResponse } from '@shared/api/checked-response';
import { HttpService } from '@shared/api/http.service';
import { map, Observable } from 'rxjs';
import { IGameDTO } from '../model/game';

// The response is checked against the shared schema; the client keeps the dates
// of a game as Date (see IGameDTO), so the checked data is typed accordingly
// The wire has ISO strings, the client works with Date: converted at the boundary
const withDates = (game: unknown): IGameDTO => {
  const wire = game as Record<string, unknown>;
  const date = (value: unknown) =>
    typeof value === 'string' ? new Date(value) : value;
  return {
    ...wire,
    playedAt: date(wire['playedAt']),
    ...(wire['createdAt'] ? { createdAt: date(wire['createdAt']) } : null),
    ...(wire['updatedAt'] ? { updatedAt: date(wire['updatedAt']) } : null),
  } as IGameDTO;
};
const asGame = map(withDates);
const asGames = map((games: unknown) => (games as unknown[]).map(withDates));

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

  /** `version` is the one the editor saw: the server refuses a save of an old one (S10.54). */
  public update(
    id: string,
    game: IGameDTO,
    version?: number,
  ): Observable<IGameDTO> {
    return this.httpService.patch<IGameDTO, IGameDTO>(
      `games/${id}`,
      game,
      version === undefined ? {} : { 'If-Match': String(version) },
    );
  }

  public replace(id: string, game: IGameDTO) {
    return this.httpService.put<IGameDTO>(`games/${id}`, game);
  }

  /** Takes or renews the lease of the game; 409 says who is editing it (S10.54). */
  public lock(id: string): Observable<IGameDTO> {
    return this.httpService
      .post<unknown, unknown>(`games/${id}/lock`)
      .pipe(checkedResponse(gameSchema, 'POST games/:id/lock'), asGame);
  }

  public unlock(id: string): Observable<null> {
    return this.httpService.delete<null>(`games/${id}/lock`);
  }

  /** The confirmation of the person who asks; the second one of another person publishes (S10.35). */
  public confirm(id: string): Observable<IGameDTO> {
    return this.httpService
      .post<unknown, unknown>(`games/${id}/confirm`)
      .pipe(checkedResponse(gameSchema, 'POST games/:id/confirm'), asGame);
  }

  public unconfirm(id: string): Observable<IGameDTO> {
    return this.httpService
      .delete<unknown>(`games/${id}/confirm`)
      .pipe(checkedResponse(gameSchema, 'DELETE games/:id/confirm'), asGame);
  }

  public revoke(id: string, reason: string): Observable<IGameDTO> {
    return this.httpService
      .post<{ reason: string }, unknown>(`games/${id}/revoke`, { reason })
      .pipe(checkedResponse(gameSchema, 'POST games/:id/revoke'), asGame);
  }

  public delete(id: string) {
    return this.httpService.delete<IGameDTO>(`games/${id}`);
  }
}
