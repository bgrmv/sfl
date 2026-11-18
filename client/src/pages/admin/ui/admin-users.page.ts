import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ASSIGNABLE_ROLES } from '@sfl/schemas';
import type { AdminUser, AssignableRole } from '@sfl/schemas';
import { apiErrorMessage } from '@shared/api/api-error-message';
import { toResult } from '@shared/api/to-result';
import { AuthService } from '@shared/auth/auth.service';
import { KIT } from '@shared/ui/kit';
import { UsersAdminService } from '../api/users-admin.service';

/**
 * Access levels (admin only): who may do what. A person with no role has the
 * level of a guest. The server checks the rights again and keeps at least one
 * admin; a changed level ends the sessions of the person.
 */
@Component({
  selector: 'sfl-admin-users-page',
  imports: [...KIT],
  providers: [UsersAdminService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.users'"
    >
      <sfl-page-head
        title="Users and access"
        lead="Only an admin gives roles. Nobody can take the admin role from himself."
      />
      <sfl-card
        flag="admin.users"
        title="Levels"
      >
        <ul class="k-small">
          <li>
            <b>Admin</b>
            : everything, including roles, players, teams and statistics.
          </li>
          <li>
            <b>Moderator</b>
            : confirms games and reviews comments.
          </li>
          <li>
            <b>User</b>
            : a signed-in person: reads the public part and the own profile.
          </li>
          <li>
            <b>No role</b>
            : the level of a guest, reads only what is public.
          </li>
        </ul>
      </sfl-card>
      <sfl-card
        flag="admin.users"
        [title]="'Accounts · ' + shown().length"
      >
        <div class="k-field">
          <label for="q">Search by name or nickname</label>
          <input
            id="q"
            class="k-input"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
        </div>
        @if (error()) {
          <p
            class="k-callout"
            role="alert"
          >
            {{ error() }}
          </p>
        }
        @if (loading()) {
          <sfl-state kind="loading" />
        } @else {
          <table class="k-table">
            <caption class="k-visually-hidden">
              Accounts and their roles
            </caption>
            <thead>
              <tr>
                <th>Person</th>
                @for (r of roles; track r) {
                  <th>{{ label(r) }}</th>
                }
                <th>Google</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (u of shown(); track u.id) {
                <tr>
                  <td>
                    {{ u.nickname || '—' }}
                    <span class="k-muted k-small">
                      {{ u.name }} {{ u.surname }}
                    </span>
                  </td>
                  @for (r of roles; track r) {
                    <td>
                      <input
                        type="checkbox"
                        [checked]="has(u, r)"
                        [attr.aria-label]="label(r) + ' for ' + u.name"
                        [disabled]="saving() === u.id"
                        (change)="toggle(u, r, $any($event.target).checked)"
                      />
                    </td>
                  }
                  <td>{{ u.hasGoogle ? 'linked' : '—' }}</td>
                  <td>
                    @if (dirty(u)) {
                      <button
                        sflBtn
                        size="sm"
                        type="button"
                        [disabled]="saving() === u.id"
                        (click)="save(u)"
                      >
                        Save
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </sfl-card>
    </div>
  `,
})
export class AdminUsersPageComponent {
  private readonly users = inject(UsersAdminService);
  protected readonly me = inject(AuthService).user;

  protected readonly roles = ASSIGNABLE_ROLES;
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly query = signal('');
  protected readonly saving = signal('');

  private readonly all = signal<AdminUser[]>([]);
  /** Roles chosen but not saved yet, by user id. */
  private readonly drafts = signal<Record<string, AssignableRole[]>>({});

  protected readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.all()
      .filter(u =>
        !q
          ? true
          : [u.name, u.surname, u.nickname ?? '']
              .join(' ')
              .toLowerCase()
              .includes(q),
      )
      .sort(
        (a, b) =>
          rank(b) - rank(a) ||
          (a.nickname ?? a.name).localeCompare(b.nickname ?? b.name),
      );
  });

  constructor() {
    this.users
      .list()
      .pipe(toResult())
      .subscribe(result => {
        this.loading.set(false);
        if (!result.ok) return this.error.set(apiErrorMessage(result.error));
        this.all.set(result.value);
      });
  }

  protected label(role: AssignableRole): string {
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  private current(user: AdminUser): AssignableRole[] {
    return (
      this.drafts()[user.id] ??
      (user.roles.filter(r =>
        (ASSIGNABLE_ROLES as readonly string[]).includes(r),
      ) as AssignableRole[])
    );
  }

  protected has(user: AdminUser, role: AssignableRole): boolean {
    return this.current(user).includes(role);
  }

  protected dirty(user: AdminUser): boolean {
    return user.id in this.drafts();
  }

  protected toggle(user: AdminUser, role: AssignableRole, on: boolean) {
    const next = this.current(user).filter(r => r !== role);
    if (on) next.push(role);
    this.drafts.update(d => ({ ...d, [user.id]: next }));
  }

  protected save(user: AdminUser) {
    this.saving.set(user.id);
    this.error.set('');
    this.users
      .setRoles(user.id, this.current(user))
      .pipe(toResult())
      .subscribe(result => {
        this.saving.set('');
        if (!result.ok) return this.error.set(apiErrorMessage(result.error));
        this.all.update(list =>
          list.map(u => (u.id === user.id ? result.value : u)),
        );
        this.drafts.update(d => {
          const rest = { ...d };
          delete rest[user.id];
          return rest;
        });
      });
  }
}

/** Admins first, then moderators, then the rest. */
function rank(user: AdminUser): number {
  return user.roles.includes('ADMIN')
    ? 2
    : user.roles.includes('MODERATOR')
      ? 1
      : 0;
}
