import { computed, inject, signal, Service } from '@angular/core';
import { delay, tap } from 'rxjs';
import { HttpService } from './http.service';

interface User {
  id: string;
  email: string;
  roles: string[];
  accessToken?: string;
}

@Service()
export class AuthService {
  private readonly httpService = inject(HttpService);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();

  public readonly isAdmin = computed(() => {
    return this.user()?.roles.some(role => role === 'ADMIN') ?? false;
  });

  setUser(user: User | null) {
    this._user.set(user);
  }

  constructor() {
    this.whoAmI();
  }

  whoAmI() {
    this.httpService.get<User>('auth/whoami').subscribe(response => {
      if (response) {
        this.setUser({
          id: response.id,
          email: response.email,
          roles: response.roles,
        });
      }
    });
  }

  signIn(payload: { email: string; password: string }) {
    return this.httpService.post<User>('auth/sign-in', payload).pipe(
      delay(1500),
      tap(response => {
        const accessToken = response?.accessToken;

        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          this.whoAmI();
        }
      }),
    );
  }

  signOut() {
    return this.httpService.post<User>('auth/sign-out').pipe(
      tap(() => {
        this.setUser(null);
        localStorage.removeItem('accessToken');
      }),
    );
  }
}
