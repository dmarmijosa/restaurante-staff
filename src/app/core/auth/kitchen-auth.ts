import type { RestaurantRepository } from '../domain/repositories/repositories';

/** Longitud fija del PIN de la tablet de cocina. */
export const KITCHEN_PIN_LENGTH = 6;

export function isKitchenPinValid(pin: string): boolean {
  return new RegExp(`^\\d{${KITCHEN_PIN_LENGTH}}$`).test(pin.trim());
}

/** Cuenta interna de la tablet de cocina (no se muestra al personal). */
export function buildKitchenAccountEmail(restaurantId: string): string {
  return `kitchen+${restaurantId}@restaurantestaff.internal`;
}

export function isKitchenSystemEmail(email: string): boolean {
  return /^kitchen\+[0-9a-f-]{36}@restaurantestaff\.internal$/i.test(email.trim());
}

export function isMultiTenantRestaurant(count: number): boolean {
  return count > 1;
}

/**
 * Slug en la URL solo si hay varios restaurantes con admin.
 * Un solo tenant → rutas en raíz (`/cocina`, `/cocina/acceso`).
 */
export function kitchenSlugForUrl(
  slug: string | null | undefined,
  restaurantCount: number,
): string | null {
  return isMultiTenantRestaurant(restaurantCount) && slug ? slug : null;
}

/** Ruta de cocina: raíz si un solo restaurante; `/cocina/:slug` si hay varios. */
export function kitchenPath(slug?: string | null): string {
  return slug ? `/cocina/${slug}` : '/cocina';
}

export function kitchenAccessPath(slug?: string | null): string {
  return slug ? `/cocina/acceso/${slug}` : '/cocina/acceso';
}

export interface KitchenLinks {
  kitchen: string;
  acceso: string;
  multiTenant: boolean;
  slug: string | null;
}

/** Enlaces canónicos de cocina según cuántos tenants usan cocina en la plataforma. */
export async function resolveKitchenLinks(
  restaurantRepo: RestaurantRepository,
  restaurant?: { slug: string } | null,
): Promise<KitchenLinks> {
  const count = await restaurantRepo.countKitchenTenants();
  const multiTenant = isMultiTenantRestaurant(count);
  const slug = kitchenSlugForUrl(restaurant?.slug ?? null, count);
  return {
    kitchen: kitchenPath(slug),
    acceso: kitchenAccessPath(slug),
    multiTenant,
    slug,
  };
}

/** Ruta canónica de acceso PIN; quita slug si la URL no debe llevarlo. */
export function canonicalKitchenAccessPath(currentPath: string, links: KitchenLinks): string | null {
  if (currentPath === links.acceso) return null;
  if (!links.multiTenant && currentPath.includes('/cocina/acceso/')) {
    return links.acceso;
  }
  if (links.multiTenant && currentPath === '/cocina/acceso') {
    return links.acceso;
  }
  return null;
}
