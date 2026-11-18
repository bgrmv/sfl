import { inject, Service } from '@angular/core';
import { invitationPreviewSchema } from '@sfl/schemas';
import type { InvitationPreview } from '@sfl/schemas';
import { checkedResponse } from '@shared/api/checked-response';
import { HttpService } from '@shared/api/http.service';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Service()
export class InvitationService {
  private readonly http = inject(HttpService);

  /** The card of the player of a live link; an unknown, spent, expired and revoked link all fail alike (ADR 0021). */
  preview(token: string): Observable<InvitationPreview> {
    return this.http
      .get<unknown>(`auth/invitations/${encodeURIComponent(token)}`)
      .pipe(
        checkedResponse(invitationPreviewSchema, 'GET auth/invitations/:token'),
        map(preview => preview as InvitationPreview),
      );
  }

  /** The sign-in is a whole-page navigation: the browser goes to Google and returns to the API. */
  googleStartUrl(token: string): string {
    return `${environment.apiUrl}/auth/google/start?invitation=${encodeURIComponent(token)}`;
  }
}
