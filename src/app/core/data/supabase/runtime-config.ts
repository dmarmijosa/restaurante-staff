/**
 * Configuración de Supabase en tiempo de ejecución.
 *
 * ¿Por qué? El proyecto es open source y arranca en "modo demo" (mock en
 * memoria). Queremos que cualquiera pueda **salir del modo demo desde la propia
 * app**: pega la URL y la clave publishable de SU proyecto Supabase, se guardan
 * en localStorage y, al recargar, la app trabaja contra su base (vacía, desde
 * cero) sin necesidad de recompilar ni tocar `.env`.
 *
 * Prioridad: localStorage (wizard / diálogo de conexión) → variables del build
 * (`.env` → `env.generated.ts`, solo para `npm start` en desarrollo).
 * El wizard nunca escribe en `.env`.
 */
import { environment } from '../../../../environments/environment';

const URL_KEY = 'rs-supabase-url';
const ANON_KEY = 'rs-supabase-anon-key';
const FORCE_DEMO_KEY = 'rs-force-demo';

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

function isForceDemo(): boolean {
  return safeGet(FORCE_DEMO_KEY) === '1';
}

/** Config efectiva: la del usuario (localStorage) o, si no, la del build. */
export function getSupabaseConfig(): SupabaseRuntimeConfig {
  const url = safeGet(URL_KEY) || environment.supabaseUrl;
  const anonKey = safeGet(ANON_KEY) || environment.supabaseAnonKey;
  return { url, anonKey };
}

/** true si la app debe usar repositorios demo (mock en memoria). */
export function isDemoMode(): boolean {
  if (isForceDemo()) return true;
  const { url, anonKey } = getSupabaseConfig();
  return !(url && anonKey);
}

/** true si hay credenciales válidas; si no, la app entra en modo demo. */
export function isSupabaseConfigured(): boolean {
  return !isDemoMode();
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

/** Borra las credenciales del usuario (vuelve al modo demo si no hay .env en el build). */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(ANON_KEY);
}

/**
 * Fuerza el modo demo aunque exista `.env` o credenciales en localStorage.
 * Útil en desarrollo para recuperar el acceso rápido por roles sin borrar `.env`.
 */
export function enterDemoMode(): void {
  localStorage.setItem(FORCE_DEMO_KEY, '1');
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(ANON_KEY);
  window.location.reload();
}

/** Sale del modo demo forzado y recarga (vuelve a .env o al wizard en localStorage). */
export function exitDemoMode(): void {
  localStorage.removeItem(FORCE_DEMO_KEY);
  window.location.reload();
}
