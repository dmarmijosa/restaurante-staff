/**
 * Banner de estado de conectividad para la tablet del mesero.
 *
 * Se muestra automáticamente cuando el dispositivo pierde la red y desaparece
 * al reconectarse. Usa `aria-live="polite"` para que los lectores de pantalla
 * anuncien el cambio sin interrumpir al usuario.
 */
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { OfflineService } from '../../core/pwa/offline.service';

@Component({
  selector: 'app-offline-banner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div aria-live="polite" aria-atomic="true">
      @if (!offline.isOnline()) {
        <div
          role="status"
          class="flex items-center gap-2.5 bg-ocre px-4 py-2.5 text-sm font-semibold text-ocre-texto"
          [class.animate-fade-in]="true"
        >
          <!-- Icono wifi-off inline -->
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <circle cx="12" cy="20" r="1"/>
          </svg>
          <span>{{ 'pwa.offline_banner' | translate }}</span>
          @if (fromCache()) {
            <span class="ml-auto text-[11px] font-normal opacity-75">
              {{ 'pwa.cached_data' | translate }}
            </span>
          }
        </div>
      } @else if (justReconnected()) {
        <div
          role="status"
          class="flex items-center gap-2.5 bg-oliva-bg px-4 py-2.5 text-sm font-semibold text-oliva-texto animate-fade-in"
        >
          <!-- Icono wifi online -->
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <circle cx="12" cy="20" r="1"/>
          </svg>
          <span>{{ 'pwa.back_online' | translate }}</span>
        </div>
      }
    </div>
  `,
})
export class OfflineBannerComponent {
  protected readonly offline = inject(OfflineService);

  /** Indica si los datos mostrados provienen del caché local. */
  readonly fromCache = input(false);
  /** Muestra brevemente el mensaje de reconexión. */
  readonly justReconnected = input(false);
}
