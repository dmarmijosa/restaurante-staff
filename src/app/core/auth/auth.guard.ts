/**
 * Guard: exige sesión activa (cualquier rol del personal).
 */
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.ready()) {
    await auth.restoreSession();
  }

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }
  return true;
};
