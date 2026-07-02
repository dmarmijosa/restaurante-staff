import { generatedEnv } from './env.generated';

/**
 * Entorno de producción. Las credenciales llegan desde variables de entorno
 * (ver scripts/set-env.mjs) para no exponer claves en el repositorio.
 */
export const environment = {
  production: true,
  supabaseUrl: generatedEnv.supabaseUrl,
  supabaseAnonKey: generatedEnv.supabaseAnonKey,
} as const;
