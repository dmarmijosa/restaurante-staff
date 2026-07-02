/**
 * Temporada y horario: interruptor de apertura, chips de temporada con
 * descripción y vista previa de lo que ve el cliente — según el diseño.
 * Al cerrar, el menú QR deja de aceptar pedidos de inmediato.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import type { Season } from '../../../core/domain/entities/entities';

const SEASON_CHIPS: Array<{ key: Season; label: string }> = [
  { key: 'alta', label: 'Temporada alta' },
  { key: 'baja', label: 'Temporada baja' },
  { key: 'cerrado', label: 'Cerrado por temporada' },
];

const SEASON_DESCS: Record<Season, string> = {
  alta: 'Horario completo, todas las mesas activas. El menú público acepta pedidos en mesa.',
  baja: 'Horario reducido y menos personal en sala. El menú público sigue aceptando pedidos.',
  cerrado:
    'El sitio público muestra “Cerrado por temporada” y deja de aceptar pedidos hasta la fecha de reapertura.',
};

@Component({
  selector: 'app-season',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[640px]" data-testid="admin-temporada">
      <div class="mb-[18px]">
        <h1 class="m-0 font-serif text-[27px] font-semibold">Temporada y horario</h1>
        <p class="mt-1 mb-0 text-[13px] text-tinta-media">
          Controla si el restaurante recibe pedidos y qué ve el cliente en el menú público.
        </p>
      </div>

      <!-- Abierto / cerrado -->
      <div class="mb-3.5 flex items-center gap-4 rounded-[14px] border border-borde bg-papel px-5 py-[18px]">
        <div class="flex-1">
          <div class="text-[15px] font-semibold">Restaurante abierto al público</div>
          <div class="mt-[3px] text-xs text-tinta-media">
            Al apagarlo, el menú QR deja de aceptar pedidos de inmediato.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          [attr.aria-checked]="store.settings().isOpen"
          aria-label="Restaurante abierto al público"
          (click)="store.toggleOpen()"
          class="relative h-7 w-[52px] flex-none cursor-pointer rounded-full border-none p-0"
          [style.background]="store.settings().isOpen ? '#7C905F' : '#D8CCBC'"
        >
          <span
            class="absolute top-0.5 h-6 w-6 rounded-full bg-papel shadow-[0_1px_3px_rgba(44,33,24,.25)] transition-[left] duration-150"
            [style.left.px]="store.settings().isOpen ? 26 : 2"
          ></span>
        </button>
      </div>

      <!-- Temporada -->
      <div class="mb-3.5 rounded-[14px] border border-borde bg-papel px-5 py-[18px]">
        <div class="mb-2.5 text-[13px] font-semibold">Temporada actual</div>
        <div class="mb-3 flex gap-1.5">
          @for (chip of seasonChips; track chip.key) {
            <button
              type="button"
              (click)="store.setSeason(chip.key)"
              class="cursor-pointer rounded-full border-none px-4 py-[9px] text-xs font-semibold"
              [class]="store.settings().season === chip.key ? 'bg-tinta text-lino' : 'bg-panal text-tinta-suave'"
            >
              {{ chip.label }}
            </button>
          }
        </div>
        <div class="mb-3.5 text-[12.5px] leading-normal text-tinta-media">{{ seasonDesc() }}</div>
        <div class="flex gap-3">
          <div class="flex-1">
            <div class="mb-[5px] text-[11px] font-semibold text-tinta-media">Inicio de temporada</div>
            <input
              value="15 mar 2026"
              readonly
              aria-label="Inicio de temporada"
              class="w-full rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none"
            />
          </div>
          <div class="flex-1">
            <div class="mb-[5px] text-[11px] font-semibold text-tinta-media">Fin de temporada</div>
            <input
              value="15 sep 2026"
              readonly
              aria-label="Fin de temporada"
              class="w-full rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Vista previa cliente -->
      <div class="rounded-[14px] border-[1.5px] border-dashed border-borde-punteado px-[18px] py-4">
        <div class="mb-2.5 text-[11px] font-bold tracking-[.06em] text-tinta-media">
          VISTA PREVIA · LO QUE VE EL CLIENTE
        </div>
        <div class="flex items-center gap-2.5">
          <span
            class="h-[9px] w-[9px] rounded-full"
            [style.background]="store.acceptingOrders() ? '#7C905F' : '#B5493A'"
          ></span>
          <span class="text-[13px]">{{ store.settings().name }}</span>
          <span class="text-xs text-tinta-media">
            {{
              store.acceptingOrders()
                ? '· menú activo, pedidos en mesa disponibles'
                : '· “Cerrado por temporada — volvemos pronto”'
            }}
          </span>
        </div>
      </div>
    </div>
  `,
})
export class SeasonComponent {
  protected readonly store = inject(RestaurantStore);
  protected readonly seasonChips = SEASON_CHIPS;
  protected readonly seasonDesc = computed(() => SEASON_DESCS[this.store.settings().season]);
}
