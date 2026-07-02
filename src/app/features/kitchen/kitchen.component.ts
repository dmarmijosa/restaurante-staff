/**
 * Pantalla de cocina: réplica del diseño (fondo cacao, tarjetas grandes de
 * comanda con cabecera ocre/arcilla según estado y un único botón de acción).
 * Cocina solo ve pedidos "recibido" y "preparando" — su trabajo termina cuando
 * el platillo está listo.
 *
 * Tiempo de cocina: cada comanda muestra los minutos que lleva esperando (reloj
 * en vivo, se refresca cada 30 s) y se resalta en rojo si supera el umbral, para
 * que la cocina priorice lo que más tiempo lleva.
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { elapsedMinutes } from '../../core/domain/entities/entities';

/** A partir de estos minutos, la comanda se marca como "lleva mucho". */
const LATE_THRESHOLD_MIN = 15;

@Component({
  selector: 'app-kitchen',
  imports: [StaffTopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-staff-topbar />
      <div class="flex-1 overflow-y-auto bg-cacao px-[30px] py-[26px]">
        <div class="mb-5 flex items-baseline gap-3.5">
          <h1 class="font-serif text-[26px] font-semibold text-lino">Cocina</h1>
          <div class="text-sm text-lino-gris">Toca el botón cuando salga el platillo — nada más.</div>
          <div class="flex-1"></div>
          <div class="text-sm text-lino-gris">{{ countLabel() }}</div>
        </div>

        @if (cards().length === 0) {
          <div
            class="rounded-[18px] border-2 border-dashed border-lino/20 p-[60px] text-center text-xl text-lino-gris"
          >
            Sin comandas pendientes — todo al día
          </div>
        }

        <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-4">
          @for (card of cards(); track card.order.id) {
            <article
              class="overflow-hidden rounded-2xl bg-marfil"
              [style.box-shadow]="card.late ? '0 0 0 3px #B5493A' : 'none'"
            >
              <header
                class="flex items-center gap-2.5 px-[18px] py-3.5"
                [style.background]="card.late ? '#B5493A' : order0(card.order.status)"
              >
                <span class="font-serif text-[22px] font-bold text-lino-calido">Mesa {{ card.order.tableNumber }}</span>
                <span class="flex-1"></span>
                <!-- Temporizador en vivo: minutos que lleva la comanda -->
                <span
                  class="rounded-full bg-black/20 px-2.5 py-0.5 text-[13px] font-bold text-lino-calido"
                  [attr.aria-label]="'Lleva ' + card.minutes + ' minutos'"
                >
                  {{ card.minutes }} min
                </span>
              </header>
              <div class="px-[18px] pt-3.5 pb-4">
                <ul class="mb-4 flex list-none flex-col gap-2 p-0">
                  @for (item of card.order.items; track item.productName) {
                    <li class="flex gap-2.5 text-[17px] font-semibold text-tinta">
                      <span class="text-arcilla">{{ item.quantity }}×</span>
                      <span>{{ item.productName }}</span>
                    </li>
                  }
                </ul>
                <button
                  type="button"
                  (click)="store.advanceOrder(card.order.id)"
                  class="w-full cursor-pointer rounded-xl border-none py-[15px] text-base font-bold text-lino-calido hover:opacity-90"
                  [style.background]="card.order.status === 'recibido' ? '#2C2118' : '#7C905F'"
                >
                  {{ card.order.status === 'recibido' ? 'Empezar a preparar' : 'Platillo listo' }}
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
  private destroyRef = inject(DestroyRef);

  /** Reloj compartido; se actualiza cada 30 s para refrescar los minutos. */
  private readonly now = signal(Date.now());

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
    return n === 1 ? '1 comanda en cola' : `${n} comandas en cola`;
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
