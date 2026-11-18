import { inject, Service } from '@angular/core';
import { invitationListSchema, invitationSchema } from '@sfl/schemas';
import type { InvitationDTO, InvitationList } from '@sfl/schemas';
import { checkedResponse } from '@shared/api/checked-response';
import { HttpService } from '@shared/api/http.service';
import { map, Observable } from 'rxjs';

/** One-day links that connect an account to a player (S8.13, ADR 0021). Admin only. */
@Service()
export class InvitationsService {
  private readonly http = inject(HttpService);

  list(): Observable<InvitationList> {
    return this.http.get<unknown>('auth/invitations').pipe(
      checkedResponse(invitationListSchema, 'GET auth/invitations'),
      map(list => list as InvitationList),
    );
  }

  /** The token is in the answer once: the database keeps only its hash. */
  create(playerId: string): Observable<InvitationDTO> {
    return this.http
      .post<{ playerId: string }, unknown>('auth/invitations', { playerId })
      .pipe(
        checkedResponse(invitationSchema, 'POST auth/invitations'),
        map(invitation => invitation as InvitationDTO),
      );
  }

  revoke(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`auth/invitations/${id}`);
  }
}
