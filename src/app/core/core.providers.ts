/**
 * Selección de implementación de repositorios.
 *
 * Los repositorios demo y Supabase coexisten; en cada llamada se elige según
 * `isSupabaseConfigured()` (localStorage del wizard o `.env` del build). Así
 * no hace falta recargar la página al pegar credenciales en /instalacion.
 */
import type { AbstractType, Provider, Type } from '@angular/core';
import {
  AuthRepository,
  CallsRepository,
  MenuRepository,
  OrdersRepository,
  PaymentsRepository,
  RestaurantRepository,
  SettingsRepository,
  StaffRepository,
  StorageRepository,
  TablesRepository,
  WorkScheduleRepository,
} from './domain/repositories/repositories';
import {
  DemoAuthRepository,
  DemoCallsRepository,
  DemoMenuRepository,
  DemoOrdersRepository,
  DemoPaymentsRepository,
  DemoRestaurantRepository,
  DemoSettingsRepository,
  DemoStaffRepository,
  DemoStorageRepository,
  DemoTablesRepository,
  DemoWorkScheduleRepository,
} from './data/demo/demo-repositories';
import {
  SupabaseAuthRepository,
  SupabaseCallsRepository,
  SupabaseMenuRepository,
  SupabaseOrdersRepository,
  SupabasePaymentsRepository,
  SupabaseRestaurantRepository,
  SupabaseSettingsRepository,
  SupabaseStaffRepository,
  SupabaseStorageRepository,
  SupabaseTablesRepository,
  SupabaseWorkScheduleRepository,
} from './data/supabase/supabase-repositories';
import { isSupabaseConfigured } from './data/supabase/runtime-config';

function dynamicRepo<T extends object>(
  token: Type<T> | AbstractType<T>,
  DemoImpl: Type<T>,
  SupabaseImpl: Type<T>,
): Provider[] {
  return [
    { provide: DemoImpl, useClass: DemoImpl },
    { provide: SupabaseImpl, useClass: SupabaseImpl },
    {
      provide: token,
      useFactory: (demo: T, supa: T) =>
        new Proxy({} as T, {
          get(_target, prop) {
            const impl = isSupabaseConfigured() ? supa : demo;
            const value = (impl as Record<string | symbol, unknown>)[prop];
            return typeof value === 'function' ? value.bind(impl) : value;
          },
        }),
      deps: [DemoImpl, SupabaseImpl],
    },
  ];
}

export function provideRepositories(): Provider[] {
  return [
    ...dynamicRepo(MenuRepository, DemoMenuRepository, SupabaseMenuRepository),
    ...dynamicRepo(TablesRepository, DemoTablesRepository, SupabaseTablesRepository),
    ...dynamicRepo(OrdersRepository, DemoOrdersRepository, SupabaseOrdersRepository),
    ...dynamicRepo(CallsRepository, DemoCallsRepository, SupabaseCallsRepository),
    ...dynamicRepo(StaffRepository, DemoStaffRepository, SupabaseStaffRepository),
    ...dynamicRepo(SettingsRepository, DemoSettingsRepository, SupabaseSettingsRepository),
    ...dynamicRepo(AuthRepository, DemoAuthRepository, SupabaseAuthRepository),
    ...dynamicRepo(StorageRepository, DemoStorageRepository, SupabaseStorageRepository),
    ...dynamicRepo(PaymentsRepository, DemoPaymentsRepository, SupabasePaymentsRepository),
    ...dynamicRepo(RestaurantRepository, DemoRestaurantRepository, SupabaseRestaurantRepository),
    ...dynamicRepo(WorkScheduleRepository, DemoWorkScheduleRepository, SupabaseWorkScheduleRepository),
  ];
}
