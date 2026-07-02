/**
 * Guard del registro inicial. Solo deja entrar a `/registro-inicial` cuando aún
 * NO existe ningún administrador; en cuanto hay uno, redirige a `/login`. Es la
 * garantía de que el alta de administrador propietario ocurre una sola vez.
 */
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const bootstrapGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    const exists = await auth.adminExists();
    return exists ? router.createUrlTree(['/login']) : true;
  } catch {
    // Ante un fallo de red, no exponemos el registro: mejor mandar al login.
    return router.createUrlTree(['/login']);
  }
};
