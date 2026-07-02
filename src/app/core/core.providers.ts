/**
 * Selección de implementación de repositorios.
 *
 * ¿Por qué aquí? Es el único punto de la app que conoce ambas capas de datos.
 * Si hay claves de Supabase se usan los repositorios reales; si no, la app
 * funciona en modo demo (en memoria) para que el proyecto open source se pueda
 * probar sin configurar nada.
 */
import type { Provider } from '@angular/core';
import {
  AuthRepository,
  CallsRepository,
  MenuRepository,
  OrdersRepository,
  PaymentsRepository,
  SettingsRepository,
  StaffRepository,
  StorageRepository,
  TablesRepository,
} from './domain/repositories/repositories';
import {
  DemoAuthRepository,
  DemoCallsRepository,
  DemoMenuRepository,
  DemoOrdersRepository,
  DemoPaymentsRepository,
  DemoSettingsRepository,
  DemoStaffRepository,
  DemoStorageRepository,
  DemoTablesRepository,
} from './data/demo/demo-repositories';
import {
  SupabaseAuthRepository,
  SupabaseCallsRepository,
  SupabaseMenuRepository,
  SupabaseOrdersRepository,
  SupabasePaymentsRepository,
  SupabaseSettingsRepository,
  SupabaseStaffRepository,
  SupabaseStorageRepository,
  SupabaseTablesRepository,
} from './data/supabase/supabase-repositories';
import { isSupabaseConfigured } from './data/supabase/supabase-client.service';

export function provideRepositories(): Provider[] {
  const useSupabase = isSupabaseConfigured();
  return [
    { provide: MenuRepository, useClass: useSupabase ? SupabaseMenuRepository : DemoMenuRepository },
    { provide: TablesRepository, useClass: useSupabase ? SupabaseTablesRepository : DemoTablesRepository },
    { provide: OrdersRepository, useClass: useSupabase ? SupabaseOrdersRepository : DemoOrdersRepository },
    { provide: CallsRepository, useClass: useSupabase ? SupabaseCallsRepository : DemoCallsRepository },
    { provide: StaffRepository, useClass: useSupabase ? SupabaseStaffRepository : DemoStaffRepository },
    { provide: SettingsRepository, useClass: useSupabase ? SupabaseSettingsRepository : DemoSettingsRepository },
    { provide: AuthRepository, useClass: useSupabase ? SupabaseAuthRepository : DemoAuthRepository },
    { provide: StorageRepository, useClass: useSupabase ? SupabaseStorageRepository : DemoStorageRepository },
    { provide: PaymentsRepository, useClass: useSupabase ? SupabasePaymentsRepository : DemoPaymentsRepository },
  ];
}
