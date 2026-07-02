import { generatedEnv } from './env.generated';

/**
 * Entorno de desarrollo. Mismas claves que producción pero con banderas de
 * desarrollo; si no hay claves la app entra en modo demo con datos de ejemplo.
 */
export const environment = {
  production: false,
  supabaseUrl: generatedEnv.supabaseUrl,
  supabaseAnonKey: generatedEnv.supabaseAnonKey,
} as const;
