/**
 * Detecta la conectividad de red del dispositivo y expone un signal reactivo.
 *
 * Escucha los eventos nativos `online`/`offline` del navegador para que
 * cualquier componente pueda reaccionar al cambio de estado sin polling.
 * Se destruye limpiamente al ser inyectado en un contexto con DestroyRef.
 */
import { Injectable, OnDestroy, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfflineService implements OnDestroy {
  /** `true` cuando el navegador tiene acceso a la red. */
  readonly isOnline = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);

  private readonly onOnline = () => this.isOnline.set(true);
  private readonly onOffline = () => this.isOnline.set(false);

  constructor() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
