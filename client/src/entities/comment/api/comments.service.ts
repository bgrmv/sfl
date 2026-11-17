import { inject, Service } from '@angular/core';
import { commentSchema, commentsSchema } from '@sfl/schemas';
import type { CommentDTO, CommentInput, CommentModeration } from '@sfl/schemas';
import { checkedResponse } from '@shared/api/checked-response';
import { HttpService } from '@shared/api/http.service';
import { map, Observable } from 'rxjs';

@Service()
export class CommentsService {
  private readonly http = inject(HttpService);

  /** The approved comments of a game: the only ones the public sees. */
  find(gameId: string): Observable<CommentDTO[]> {
    return this.http.get<unknown>('comments', { gameId }).pipe(
      checkedResponse(commentsSchema, 'GET comments'),
      map(list => list as CommentDTO[]),
    );
  }

  /** The answer is the comment with the status `pending`: it appears after the review. */
  create(input: CommentInput): Observable<CommentDTO> {
    return this.http.post<CommentInput, unknown>('comments', input).pipe(
      checkedResponse(commentSchema, 'POST comments'),
      map(comment => comment as CommentDTO),
    );
  }

  /** Admin: the comments waiting for a verdict. */
  queue(): Observable<CommentDTO[]> {
    return this.http.get<unknown>('comments/queue').pipe(
      checkedResponse(commentsSchema, 'GET comments/queue'),
      map(list => list as CommentDTO[]),
    );
  }

  moderate(id: string, input: CommentModeration): Observable<CommentDTO> {
    return this.http
      .patch<CommentModeration, unknown>(`comments/${id}`, input)
      .pipe(
        checkedResponse(commentSchema, 'PATCH comments/:id'),
        map(comment => comment as CommentDTO),
      );
  }

  delete(id: string): Observable<null> {
    return this.http.delete<null>(`comments/${id}`);
  }
}
