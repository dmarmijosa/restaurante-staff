/**
 * Cliente único de Supabase.
 *
 * ¿Por qué un servicio propio? supabase-js mantiene estado (sesión, websockets
 * de Realtime); crear más de un cliente duplica conexiones y provoca errores de
 * "Multiple GoTrueClient". Este servicio garantiza una sola instancia y
 * centraliza el punto donde se leen las variables de entorno.
 */
import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';

/** true si hay credenciales; si no, la app entra en modo demo. */
export function isSupabaseConfigured(): boolean {
  return Boolean(environment.supabaseUrl && environment.supabaseAnonKey);
}

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private _client: SupabaseClient | null = null;

  get client(): SupabaseClient {
    if (!this._client) {
      this._client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    }
    return this._client;
  }
}
