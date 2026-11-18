import { inject, Service } from '@angular/core';
import { adminUserSchema, adminUsersSchema } from '@sfl/schemas';
import type { AdminUser, AssignableRole } from '@sfl/schemas';
import { checkedResponse } from '@shared/api/checked-response';
import { HttpService } from '@shared/api/http.service';
import { map, Observable } from 'rxjs';

/** Accounts and their access levels (admin only). */
@Service()
export class UsersAdminService {
  private readonly http = inject(HttpService);

  list(): Observable<AdminUser[]> {
    return this.http.get<unknown>('users').pipe(
      checkedResponse(adminUsersSchema, 'GET users'),
      map(users => users as AdminUser[]),
    );
  }

  setRoles(id: string, roles: AssignableRole[]): Observable<AdminUser> {
    return this.http
      .patch<{ roles: AssignableRole[] }, unknown>(`users/${id}/roles`, {
        roles,
      })
      .pipe(
        checkedResponse(adminUserSchema, 'PATCH users/:id/roles'),
        map(user => user as AdminUser),
      );
  }
}
