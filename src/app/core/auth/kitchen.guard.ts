import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { RestaurantContextService } from '../application/restaurant-context.service';
import { RestaurantRepository } from '../domain/repositories/repositories';

/**
 * Cocina es una pantalla abierta (sin login). Solo resuelve el restaurante activo
 * desde el slug de la URL o el primer tenant disponible.
 */
export const kitchenGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const context = inject(RestaurantContextService);
  const restaurantRepo = inject(RestaurantRepository);

  if (!auth.ready()) {
    await auth.restoreSession();
  }

  const slug = route.paramMap.get('slug');
  if (slug) {
    const restaurant = await restaurantRepo.getBySlug(slug);
    if (!restaurant) {
      return router.createUrlTree(['/cocina']);
    }
    context.set(restaurant.id);
    return true;
  }

  if (!context.restaurantId()) {
    const fromAuth = auth.restaurantId();
    if (fromAuth) {
      context.set(fromAuth);
    } else {
      const restaurant = await restaurantRepo.getFirstAvailable();
      if (restaurant) context.set(restaurant.id);
    }
  }

  return true;
};
