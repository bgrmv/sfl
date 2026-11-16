import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@shared/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (!authService.isAdmin()) {
    // Redirect to the login page if not authenticated
    router.navigate(['games']);
    return false; // Deny access to the route
  }

  return true; // Allow access to the route
};
