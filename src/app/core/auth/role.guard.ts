/**
 * Guard de roles para las rutas de personal.
 *
 * ¿Por qué un factory? Las tres áreas protegidas (admin, mesero, cocina)
 * comparten la misma lógica y solo cambia el rol requerido; el factory evita
 * tres guards duplicados. Si no hay sesión se redirige al login conservando
 * la URL de destino.
 */
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import type { StaffRole } from '../domain/entities/entities';

export function roleGuard(required: StaffRole): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // Espera la restauración de la sesión para no expulsar a usuarios válidos
    // al recargar la página.
    if (!auth.ready()) {
      await auth.restoreSession();
    }

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
    }
    if (!auth.canAccess(required)) {
      // Con sesión pero sin permiso: cada quien a su área.
      const homeByRole: Record<string, string> = {
        mesero: '/mesero',
        cocina: '/cocina',
        cajero: '/cajero',
      };
      return router.createUrlTree([homeByRole[auth.role() ?? ''] ?? '/']);
    }
    return true;
  };
}
