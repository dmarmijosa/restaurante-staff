/**
 * Toasts globales, réplica del comportamiento del diseño original (mensaje
 * flotante inferior que desaparece a los 2,6 s).
 *
 * ¿Por qué servicio + signal? Cualquier capa (store, componentes) puede
 * anunciar un mensaje sin conocer al componente que lo pinta.
 */
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private timeout: ReturnType<typeof setTimeout> | null = null;

  readonly message = signal<string | null>(null);

  show(message: string, durationMs = 2600): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.message.set(message);
    this.timeout = setTimeout(() => this.message.set(null), durationMs);
  }
}
