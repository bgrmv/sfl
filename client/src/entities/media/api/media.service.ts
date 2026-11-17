import { inject, Service } from '@angular/core';
import { mediasSchema, mediaSchema } from '@sfl/schemas';
import type { MediaDTO, MediaInput } from '@sfl/schemas';
import { HttpService } from '@shared/api/http.service';
import { checkedResponse } from '@shared/api/checked-response';
import { map, Observable } from 'rxjs';

export type MediaFilter = { gameId?: string; playerId?: string };

@Service()
export class MediaService {
  private readonly http = inject(HttpService);

  find(filter: MediaFilter = {}): Observable<MediaDTO[]> {
    return this.http.get<unknown>('media', { ...filter }).pipe(
      checkedResponse(mediasSchema, 'GET media'),
      map(list => list as MediaDTO[]),
    );
  }

  /** An empty `gameId` or `playerId` stays out of the form: the photo has no link. */
  upload(file: File, fields: MediaInput = {}): Observable<MediaDTO> {
    const form = new FormData();
    form.append('file', file, file.name);
    for (const [key, value] of Object.entries(fields)) {
      if (value) form.append(key, value);
    }
    return this.http.upload<unknown>('media', form).pipe(
      checkedResponse(mediaSchema, 'POST media'),
      map(photo => photo as MediaDTO),
    );
  }

  update(id: string, input: MediaInput): Observable<MediaDTO> {
    return this.http.patch<MediaInput, unknown>(`media/${id}`, input).pipe(
      checkedResponse(mediaSchema, 'PATCH media/:id'),
      map(photo => photo as MediaDTO),
    );
  }

  delete(id: string): Observable<null> {
    return this.http.delete<null>(`media/${id}`);
  }
}
