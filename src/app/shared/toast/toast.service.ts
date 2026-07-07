/**
 * Toasts globales con soporte i18n (ngx-translate).
 *
 * El servicio acepta una clave de traducción y parámetros opcionales; el
 * componente `ToastComponent` los traduce antes de mostrarlos. Cualquier
 * capa (store, componentes) puede lanzar un toast sin conocer el idioma activo.
 */
import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  key: string;
  params?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private timeout: ReturnType<typeof setTimeout> | null = null;

  readonly message = signal<ToastMessage | null>(null);

  show(key: string, params?: Record<string, unknown>, durationMs = 2600): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.message.set({ key, params });
    this.timeout = setTimeout(() => this.message.set(null), durationMs);
  }
}

