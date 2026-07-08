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
import { resolveKitchenLinks } from './kitchen-auth';
import { RestaurantRepository } from '../domain/repositories/repositories';
import type { StaffRole } from '../domain/entities/entities';

export function roleGuard(required: StaffRole): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const restaurantRepo = inject(RestaurantRepository);

    if (!auth.ready()) {
      await auth.restoreSession();
    }

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
    }
    if (!auth.canAccess(required)) {
      const role = auth.role();
      if (role === 'cocina') {
        const restaurant = auth.restaurantId()
          ? await restaurantRepo.getById(auth.restaurantId()!)
          : await restaurantRepo.getFirstAvailable();
        const links = await resolveKitchenLinks(restaurantRepo, restaurant);
        return router.parseUrl(links.kitchen);
      }
      const homeByRole: Record<string, string> = {
        mesero: '/mesero',
        cajero: '/cajero',
      };
      return router.createUrlTree([homeByRole[role ?? ''] ?? '/']);
    }
    return true;
  };
}
