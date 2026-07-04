/**
 * Contexto del restaurante activo en la sesión.
 *
 * ¿Por qué un servicio separado? Los repositorios necesitan saber el
 * restaurant_id para filtrar queries anónimas (el cliente QR no tiene sesión
 * y la RLS no puede inferirlo). Un signal compartido aquí evita pasarlo como
 * parámetro en cada método de repositorio. Para el personal autenticado, la
 * RLS lo filtra automáticamente; igualmente se almacena aquí para que el
 * store y los componentes tengan el dato accesible sin tocar Supabase otra vez.
 */
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RestaurantContextService {
  private readonly _restaurantId = signal<string | null>(null);

  /** UUID del restaurante activo; null hasta que se resuelva (staff login o slug de URL). */
  readonly restaurantId = this._restaurantId.asReadonly();

  set(id: string): void {
    this._restaurantId.set(id);
  }

  clear(): void {
    this._restaurantId.set(null);
  }
}
