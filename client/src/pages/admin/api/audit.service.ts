import { inject, Service } from '@angular/core';
import { HttpService } from '@shared/api/http.service';
import { Observable } from 'rxjs';

/** One line of the log of the actions of the admins (`GET /audit`). */
export interface AuditEntry {
  id: string;
  actor: string;
  method: string;
  route: string;
  status: number;
  at: string;
}

@Service()
export class AuditService {
  private readonly http = inject(HttpService);

  latest(): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>('audit');
  }
}
