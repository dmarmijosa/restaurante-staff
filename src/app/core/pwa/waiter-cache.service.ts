/**
 * Caché local para la vista del mesero.
 *
 * Persiste en localStorage la última instantánea de mesas, pedidos activos
 * y llamadas pendientes de modo que, si el SW sirve el app-shell sin red,
 * la tablet muestre los últimos datos conocidos en lugar de una pantalla vacía.
 *
 * El store llama a `save()` cada vez que los datos cambian, y el componente
 * del mesero llama a `load()` cuando el store retorna vacío (inicio offline).
 */
import { Injectable, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Order, RestaurantTable, WaiterCall } from '../domain/entities/entities';

export interface WaiterSnapshot {
  tables: RestaurantTable[];
  orders: Order[];
  calls: WaiterCall[];
  savedAt: string;
}

const CACHE_KEY = 'rs_waiter_snapshot';
/** Tiempo máximo que se considera válida la caché (4 horas). */
const MAX_AGE_MS = 4 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class WaiterCacheService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Guarda la instantánea actual en localStorage. */
  save(tables: RestaurantTable[], orders: Order[], calls: WaiterCall[]): void {
    if (!this.isBrowser) return;
    const snapshot: WaiterSnapshot = {
      tables,
      orders,
      calls,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // localStorage puede lanzar en modo privado con cuota llena; ignorar.
    }
  }

  /**
   * Devuelve la última instantánea válida, o `null` si no existe o caducó.
   * Los datos tienen un máximo de 4 horas de antigüedad para no confundir
   * al mesero con información del turno anterior.
   */
  load(): WaiterSnapshot | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const snapshot = JSON.parse(raw) as WaiterSnapshot;
      const age = Date.now() - new Date(snapshot.savedAt).getTime();
      if (age > MAX_AGE_MS) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return snapshot;
    } catch {
      return null;
    }
  }

  clear(): void {
    if (this.isBrowser) localStorage.removeItem(CACHE_KEY);
  }
}
