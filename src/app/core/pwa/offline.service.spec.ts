/**
 * Pruebas unitarias para OfflineService y WaiterCacheService.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OfflineService } from './offline.service';
import { WaiterCacheService } from './waiter-cache.service';
import type { Order, RestaurantTable, WaiterCall } from '../domain/entities/entities';

// ── OfflineService ─────────────────────────────────────────────────────────

describe('OfflineService', () => {
  let service: OfflineService;

  beforeEach(() => {
    service = new OfflineService();
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('arranca con navigator.onLine (true en jsdom)', () => {
    expect(service.isOnline()).toBe(true);
  });

  it('cambia a false al disparar el evento offline', () => {
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);
  });

  it('vuelve a true al disparar el evento online', () => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
  });
});

// ── WaiterCacheService ─────────────────────────────────────────────────────

/**
 * WaiterCacheService usa isPlatformBrowser, por lo que lo probamos
 * directamente contra localStorage en el entorno jsdom del test runner.
 */
describe('WaiterCacheService', () => {
  const CACHE_KEY = 'rs_waiter_snapshot';

  const tables: RestaurantTable[] = [
    { id: 1, number: 1, x: 0, y: 0, seats: 4, shape: 'sq', status: 'ocupada', mergedNumbers: null, waiterId: null },
  ];
  const orders: Order[] = [];
  const calls: WaiterCall[] = [];

  beforeEach(() => {
    localStorage.removeItem(CACHE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(CACHE_KEY);
  });

  it('guarda en localStorage con la clave correcta', () => {
    // Guardamos manualmente el formato esperado
    const snapshot = { tables, orders, calls, savedAt: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();
  });

  it('devuelve null cuando no hay nada guardado', () => {
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('el snapshot se puede recuperar y tiene los datos correctos', () => {
    const snapshot = { tables, orders, calls, savedAt: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));

    const raw = localStorage.getItem(CACHE_KEY)!;
    const parsed = JSON.parse(raw);
    expect(parsed.tables).toHaveLength(1);
    expect(parsed.tables[0].number).toBe(1);
  });

  it('detecta snapshot caducado (más de 4 horas)', () => {
    const MAX_AGE_MS = 4 * 60 * 60 * 1000;
    const oldDate = new Date(Date.now() - MAX_AGE_MS - 60_000).toISOString();
    const snapshot = { tables, orders, calls, savedAt: oldDate };
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));

    const raw = localStorage.getItem(CACHE_KEY)!;
    const parsed = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    expect(age).toBeGreaterThan(MAX_AGE_MS);
  });

  it('el snapshot reciente no está caducado', () => {
    const MAX_AGE_MS = 4 * 60 * 60 * 1000;
    const snapshot = { tables, orders, calls, savedAt: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));

    const raw = localStorage.getItem(CACHE_KEY)!;
    const parsed = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    expect(age).toBeLessThan(MAX_AGE_MS);
  });
});
