/**
 * Guard del registro inicial (legacy, alias /registro-inicial).
 * Últimamente /nuevo-restaurante está siempre disponible para crear nuevos
 * tenants; este guard solo protege el alias legado.
 */
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const bootstrapGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    // Sin restaurant_id específico: si hay cualquier admin, la ruta legacy se cierra.
    const exists = await auth.adminExists();
    return exists ? router.createUrlTree(['/login']) : true;
  } catch {
    return router.createUrlTree(['/login']);
  }
};
