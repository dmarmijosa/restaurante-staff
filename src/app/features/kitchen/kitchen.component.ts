/**
 * Pantalla de cocina: réplica del diseño (fondo cacao, tarjetas grandes de
 * comanda con cabecera ocre/arcilla según estado y un único botón de acción).
 * Cocina solo ve pedidos "recibido" y "preparando" — su trabajo termina cuando
 * el platillo está listo.
 *
 * Tiempo de cocina: cada comanda muestra los minutos que lleva esperando (reloj
 * en vivo, se refresca cada 30 s) y se resalta en rojo si supera el umbral, para
 * que la cocina priorice lo que más tiempo lleva.
 *
 * Notificación sonora automática: se detectan IDs nuevos en kitchenOrders (no
 * solo el conteo) para ser robusto ante añadir+quitar en el mismo tick. Si el
 * AudioContext está suspendido cuando llega la comanda, el tono queda encolado
 * en BeepService y se dispara en cuanto el usuario toca la pantalla (prime).
 * Mientras el tono está pendiente se muestra un indicador pulsante junto al
 * botón de silencio para que el cocinero sepa que hay un aviso esperando.
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { BeepService } from '../../shared/beep.service';
import { elapsedMinutes } from '../../core/domain/entities/entities';

/** A partir de estos minutos, la comanda se marca como "lleva mucho". */
const LATE_THRESHOLD_MIN = 15;

@Component({
  selector: 'app-kitchen',
  imports: [StaffTopbarComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // El AudioContext solo suena tras un gesto: lo despertamos en el primer toque.
  // Si había un beep pendiente (comanda llegada con contexto suspendido), se
  // reproduce aquí mismo sin que el cocinero tenga que hacer nada extra.
  host: { '(pointerdown)': 'beep.prime()' },
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-staff-topbar />

      <!-- Área principal en cacao -->
      <div class="flex-1 overflow-y-auto bg-cacao px-4 py-6 sm:px-7 sm:py-7">

        <!-- Cabecera de cocina -->
        <div class="mb-6 flex flex-wrap items-center gap-3">
          <div>
            <h1 class="font-serif text-[24px] font-semibold leading-none text-lino sm:text-[28px]">
              {{ 'kitchen.title' | translate }}
            </h1>
            <p class="mt-1 text-[12px] text-lino-gris">{{ 'kitchen.subtitle' | translate }}</p>
          </div>
          <div class="flex-1"></div>

          <!-- Contador de comandas -->
          <span class="rounded-full bg-lino/10 px-3.5 py-1.5 text-[12px] font-semibold text-lino-gris">
            {{ countLabel().key | translate: (countLabel().params ?? {}) }}
          </span>

          <!-- Indicador beep pendiente -->
          @if (beep.pendingBeep() && !beep.muted()) {
            <span
              class="relative flex h-3 w-3 self-center"
              role="status"
              [attr.aria-label]="'kitchen.tap_for_sound' | translate"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-arcilla opacity-75"></span>
              <span class="relative inline-flex h-3 w-3 rounded-full bg-arcilla"></span>
            </span>
          }

          <!-- Toggle sonido -->
          <button
            type="button"
            (click)="beep.toggleMuted()"
            [attr.aria-pressed]="beep.muted()"
            [attr.aria-label]="(beep.muted() ? 'kitchen.activate_sound' : 'kitchen.mute_sound') | translate"
            class="flex cursor-pointer items-center gap-2 rounded-full border border-lino/20 bg-lino/5 px-3.5 py-2
                   text-[12px] font-semibold text-lino-gris transition-colors hover:bg-lino/10 hover:text-lino"
          >
            <span class="h-2 w-2 rounded-full transition-colors"
                  [style.background]="beep.muted() ? '#8B7A69' : '#7C905F'"></span>
            {{ (beep.muted() ? 'kitchen.sound_off' : 'kitchen.sound_on') | translate }}
          </button>
        </div>

        <!-- Estado vacío -->
        @if (cards().length === 0) {
          <div class="flex flex-col items-center justify-center gap-4 rounded-[20px] border-2 border-dashed border-lino/15 p-16 text-center">
            <svg class="h-14 w-14 text-lino/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-[16px] text-lino-gris">{{ 'kitchen.no_orders' | translate }}</span>
          </div>
        }

        <!-- Grid de comandas -->
        <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-4 sm:gap-5">
          @for (card of cards(); track card.order.id) {
            <article
              class="overflow-hidden rounded-[20px] bg-marfil transition-shadow duration-200"
              [style.box-shadow]="card.late
                ? '0 0 0 2.5px #B5493A, 0 8px 24px rgba(181,73,58,.3)'
                : '0 4px 20px rgba(0,0,0,.25)'"
            >
              <!-- Cabecera de la comanda -->
              <header
                class="flex items-center gap-3 px-5 py-4"
                [style.background]="card.late ? '#B5493A' : order0(card.order.status)"
              >
                <div>
                  <div class="font-serif text-[20px] font-bold leading-none text-lino-calido sm:text-[23px]">
                    Mesa {{ card.order.tableNumber }}
                  </div>
                  <div class="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-lino-calido/70">
                    {{ card.order.status === 'recibido' ? ('kitchen.status_received' | translate) : ('kitchen.status_preparing' | translate) }}
                  </div>
                </div>
                <div class="flex-1"></div>
                <!-- Timer -->
                <div
                  class="flex flex-col items-end"
                  [attr.aria-label]="'kitchen.elapsed_label' | translate: { minutes: card.minutes }"
                >
                  <span class="text-[22px] font-bold leading-none text-lino-calido">{{ card.minutes }}</span>
                  <span class="text-[10px] font-semibold text-lino-calido/70">{{ 'kitchen.min_label' | translate }}</span>
                </div>
              </header>

              <!-- Items de la comanda -->
              <div class="px-5 pt-4 pb-5">
                <ul class="mb-5 flex list-none flex-col gap-2.5 p-0">
                  @for (item of card.order.items; track item.productName) {
                    <li class="flex items-baseline gap-3 text-[16px] font-semibold text-tinta sm:text-[18px]">
                      <span class="min-w-[1.5rem] rounded-[6px] bg-arcilla/15 px-1.5 text-center text-[14px] font-bold text-arcilla">
                        {{ item.quantity }}
                      </span>
                      <span class="leading-snug">{{ item.productName }}</span>
                    </li>
                  }
                </ul>
                <!-- Botón de acción -->
                <button
                  type="button"
                  (click)="store.advanceOrder(card.order.id)"
                  class="w-full cursor-pointer rounded-[13px] border-none py-4 text-[14.5px] font-bold text-lino-calido
                         shadow-sm transition-all duration-150 hover:opacity-90 active:scale-[.99]"
                  [style.background]="card.order.status === 'recibido' ? '#2C2118' : '#7C905F'"
                >
                  {{ (card.order.status === 'recibido' ? 'kitchen.start_preparing' : 'kitchen.mark_ready') | translate }}
                </button>
              </div>
            </article>
          }
        </div>
      </div>
    </div>
  `,
})
export class KitchenComponent implements OnInit {
  protected readonly store = inject(RestaurantStore);
  protected readonly beep = inject(BeepService);
  private destroyRef = inject(DestroyRef);

  /** Reloj compartido; se actualiza cada 30 s para refrescar los minutos. */
  private readonly now = signal(Date.now());

  /**
   * IDs de comandas ya conocidas al cargar la vista.
   * Permite detectar solo las que llegan después de la carga inicial
   * (no sonar al entrar aunque haya comandas pendientes de turnos anteriores).
   */
  private readonly knownIds = new Set<number>();
  private initialized = false;

  constructor() {
    /**
     * Dispara el aviso sonoro cuando llega una comanda realmente nueva.
     *
     * Se rastrea por ID en lugar de por conteo para evitar falsos positivos
     * (p.ej., si una comanda avanza a "listo" y entra otra en el mismo ciclo,
     * el conteo no cambia pero sí hay una ID nueva).
     */
    effect(() => {
      const orders = this.store.kitchenOrders();

      if (!this.initialized) {
        // Primera evaluación: marcar todas las existentes como conocidas sin sonar.
        orders.forEach((o) => this.knownIds.add(o.id));
        this.initialized = true;
        return;
      }

      // Detectar IDs que no estaban en la última instantánea.
      const hasNew = orders.some((o) => !this.knownIds.has(o.id));
      // Actualizar el set con el estado actual (añadir nuevas, las avanzadas
      // a "listo" ya no aparecen en kitchenOrders pero sus IDs quedan, lo que
      // evita sonar si por algún motivo vuelven a aparecer brevemente).
      orders.forEach((o) => this.knownIds.add(o.id));

      if (hasNew) this.beep.beep();
    });
  }

  /** Comandas de cocina ordenadas de más antigua a más reciente, con su tiempo. */
  protected readonly cards = computed(() => {
    const nowMs = this.now();
    return this.store
      .kitchenOrders()
      .map((order) => {
        const minutes = elapsedMinutes(order, nowMs);
        return { order, minutes, late: minutes >= LATE_THRESHOLD_MIN };
      })
      .sort((a, b) => b.minutes - a.minutes);
  });

  protected readonly countLabel = computed(() => {
    const n = this.store.kitchenOrders().length;
    return n === 1
      ? { key: 'kitchen.queue_one' }
      : { key: 'kitchen.queue_many', params: { n } };
  });

  ngOnInit(): void {
    void this.store.init();
    const timer = setInterval(() => this.now.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  /** Color de cabecera por estado (cuando no está retrasada). */
  protected order0(status: string): string {
    return status === 'recibido' ? '#C49A3F' : '#B5764C';
  }
}
