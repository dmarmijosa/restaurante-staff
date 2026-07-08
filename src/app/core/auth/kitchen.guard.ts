import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { RestaurantContextService } from '../application/restaurant-context.service';
import { RestaurantRepository } from '../domain/repositories/repositories';
import {
  canonicalKitchenAccessPath,
  resolveKitchenLinks,
} from './kitchen-auth';

/** Resuelve el restaurante de la tablet (prioriza el que tiene PIN de cocina). */
export async function resolveKitchenRestaurant(
  route: ActivatedRouteSnapshot,
  restaurantRepo: RestaurantRepository,
  context: RestaurantContextService,
): Promise<{ id: string; name: string; slug: string } | null> {
  const slug = route.paramMap.get('slug');
  const restaurant = await restaurantRepo.resolveForKitchen(slug);
  if (restaurant) context.set(restaurant.id);
  return restaurant;
}

function isAccessRoute(route: ActivatedRouteSnapshot): boolean {
  return route.routeConfig?.path?.startsWith('cocina/acceso') ?? false;
}

/**
 * Un solo restaurante → siempre `/cocina` o `/cocina/acceso` (sin slug).
 * Varios → `/cocina/:slug` y `/cocina/acceso/:slug`.
 */
async function canonicalKitchenRedirect(
  route: ActivatedRouteSnapshot,
  restaurantRepo: RestaurantRepository,
  restaurant: { slug: string },
): Promise<string | null> {
  const links = await resolveKitchenLinks(restaurantRepo, restaurant);
  const routeSlug = route.paramMap.get('slug');
  const isAccess = isAccessRoute(route);

  if (!links.multiTenant && routeSlug) {
    return isAccess ? links.acceso : links.kitchen;
  }
  if (links.multiTenant && !routeSlug) {
    return isAccess ? links.acceso : links.kitchen;
  }
  return null;
}

/** Pantalla de comandas: exige sesión cocina con PIN ya validado. */
export const kitchenGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const context = inject(RestaurantContextService);
  const restaurantRepo = inject(RestaurantRepository);

  const restaurant = await resolveKitchenRestaurant(route, restaurantRepo, context);
  if (!restaurant) {
    const links = await resolveKitchenLinks(restaurantRepo);
    return router.parseUrl(links.acceso);
  }

  const canonical = await canonicalKitchenRedirect(route, restaurantRepo, restaurant);
  if (canonical) {
    return router.parseUrl(canonical);
  }

  if (!auth.ready()) {
    await auth.restoreSession();
  }

  const links = await resolveKitchenLinks(restaurantRepo, restaurant);

  if (!auth.canAccessKitchen()) {
    return router.parseUrl(links.acceso);
  }

  const userRId = auth.restaurantId();
  if (userRId && userRId !== restaurant.id) {
    await auth.signOut();
    return router.parseUrl(links.acceso);
  }

  return true;
};

/** Teclado PIN: si ya hay sesión válida, salta a la pantalla de cocina. */
export const kitchenAccessGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const context = inject(RestaurantContextService);
  const restaurantRepo = inject(RestaurantRepository);

  const restaurant = await resolveKitchenRestaurant(route, restaurantRepo, context);
  if (restaurant) {
    const canonical = await canonicalKitchenRedirect(route, restaurantRepo, restaurant);
    if (canonical) {
      return router.parseUrl(canonical);
    }
  }

  if (!auth.ready()) {
    await auth.restoreSession();
  }

  if (restaurant && auth.canAccessKitchen() && auth.restaurantId() === restaurant.id) {
    const links = await resolveKitchenLinks(restaurantRepo, restaurant);
    return router.parseUrl(links.kitchen);
  }

  return true;
};
