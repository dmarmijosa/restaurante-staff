/**
 * Configuración de Supabase en tiempo de ejecución.
 *
 * ¿Por qué? El proyecto es open source y arranca en "modo demo" (mock en
 * memoria). Queremos que cualquiera pueda **salir del modo demo desde la propia
 * app**: pega la URL y la clave publishable de SU proyecto Supabase, se guardan
 * en localStorage y, al recargar, la app trabaja contra su base (vacía, desde
 * cero) sin necesidad de recompilar ni tocar `.env`.
 *
 * Prioridad: localStorage (lo que el usuario configuró) → variables del build.
 */
import { environment } from '../../../../environments/environment';

const URL_KEY = 'rs-supabase-url';
const ANON_KEY = 'rs-supabase-anon-key';

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
}

function safeGet(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Config efectiva: la del usuario (localStorage) o, si no, la del build. */
export function getSupabaseConfig(): SupabaseRuntimeConfig {
  const url = safeGet(URL_KEY) || environment.supabaseUrl;
  const anonKey = safeGet(ANON_KEY) || environment.supabaseAnonKey;
  return { url, anonKey };
}

/** true si hay credenciales válidas; si no, la app entra en modo demo. */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

/** ¿La configuración activa proviene de localStorage (la puso el usuario)? */
export function isRuntimeConfigured(): boolean {
  return Boolean(safeGet(URL_KEY) && safeGet(ANON_KEY));
}

/** Guarda las credenciales del usuario (para salir del modo demo). */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(URL_KEY, url.trim());
  localStorage.setItem(ANON_KEY, anonKey.trim());
}

/** Borra las credenciales del usuario (vuelve al modo demo). */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(ANON_KEY);
}
