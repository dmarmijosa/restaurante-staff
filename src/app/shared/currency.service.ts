/**
 * Señal global del símbolo de moneda activo.
 *
 * ¿Por qué un servicio separado y no leer directamente RestaurantStore?
 * MoneyPipe necesita acceder a la moneda sin crear una dependencia circular
 * (el store importa entidades del dominio, que no deben conocer el pipe).
 * Este servicio es el único punto de verdad del símbolo; el store lo actualiza
 * al cargar ajustes o cuando el admin lo cambia.
 */
import { Injectable, signal } from '@angular/core';

/** Símbolo por defecto en demo, ajustes iniciales y nuevos tenants. */
export const DEFAULT_CURRENCY = '€';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  /** Símbolo de moneda actual (p. ej. '€', '$', '£'). */
  readonly symbol = signal(DEFAULT_CURRENCY);
}
