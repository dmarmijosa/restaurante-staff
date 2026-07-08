/**
 * Cliente único de Supabase.
 *
 * ¿Por qué un servicio propio? supabase-js mantiene estado (sesión, websockets
 * de Realtime); crear más de un cliente duplica conexiones y provoca errores de
 * "Multiple GoTrueClient". Este servicio garantiza una sola instancia y lee la
 * configuración efectiva (localStorage del usuario o variables del build).
 */
import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, isSupabaseConfigured } from './runtime-config';

// Re-export para no romper los imports existentes que apuntan a este archivo.
export { isSupabaseConfigured };

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private _client: SupabaseClient | null = null;

  get client(): SupabaseClient {
    if (!this._client) {
      const { url, anonKey } = getSupabaseConfig();
      this._client = createClient(url, anonKey);
    }
    return this._client;
  }
}
