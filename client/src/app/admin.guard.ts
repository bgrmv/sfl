import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@shared/auth/auth.service';

/**
 * Editing routes are for the admin. A guest goes to the sign-in page and comes
 * back to the asked page after it; a signed-in person without the role goes
 * to the games. (The server checks the role again, this only saves the trip.)
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isAdmin()) return true;

  if (!authService.user()) {
    return router.createUrlTree(['/sign-in'], {
      queryParams: { returnUrl: state.url },
    });
  }
  return router.createUrlTree(['/games']);
};

/**
 * The admin area is for the staff: an admin or a moderator (S10.35). A page that only
 * an admin may use keeps `authGuard` on its own route.
 */
export const staffGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const roles = authService.user()?.roles ?? [];
  if (roles.includes('ADMIN') || roles.includes('MODERATOR')) return true;

  if (!authService.user()) {
    return router.createUrlTree(['/sign-in'], {
      queryParams: { returnUrl: state.url },
    });
  }
  return router.createUrlTree(['/games']);
};
