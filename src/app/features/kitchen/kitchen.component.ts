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
  host: { '(pointerdown)': 'beep.prime()' },
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-staff-topbar />
      <div class="flex-1 overflow-y-auto bg-cacao px-[30px] py-[26px]">
        <div class="mb-5 flex items-baseline gap-3.5">
          <h1 class="font-serif text-[26px] font-semibold text-lino">{{ 'kitchen.title' | translate }}</h1>
          <div class="text-sm text-lino-gris">{{ 'kitchen.subtitle' | translate }}</div>
          <div class="flex-1"></div>
          <button
            type="button"
            (click)="beep.toggleMuted()"
            [attr.aria-pressed]="beep.muted()"
            [attr.aria-label]="(beep.muted() ? 'kitchen.activate_sound' : 'kitchen.mute_sound') | translate"
            class="flex cursor-pointer items-center gap-2 rounded-full border border-lino/20 bg-transparent px-3 py-1.5 text-[12px] font-semibold text-lino-gris hover:text-lino"
          >
            <span
              class="h-2 w-2 rounded-full"
              [style.background]="beep.muted() ? '#8B7A69' : '#7C905F'"
            ></span>
            {{ (beep.muted() ? 'kitchen.sound_off' : 'kitchen.sound_on') | translate }}
          </button>
          <div class="text-sm text-lino-gris">{{ countLabel().key | translate: (countLabel().params ?? {}) }}</div>
        </div>

        @if (cards().length === 0) {
          <div
            class="rounded-[18px] border-2 border-dashed border-lino/20 p-[60px] text-center text-xl text-lino-gris"
          >
            {{ 'kitchen.no_orders' | translate }}
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
                  [attr.aria-label]="'kitchen.elapsed_label' | translate: { minutes: card.minutes }"
                >
                  {{ card.minutes }} {{ 'kitchen.min_label' | translate }}
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

  /** Nº de comandas en la anterior comprobación, para detectar entradas nuevas. */
  private prevCount = -1;

  constructor() {
    // Suena cuando la cola de cocina crece (entra una comanda nueva).
    effect(() => {
      const count = this.store.kitchenOrders().length;
      if (this.prevCount >= 0 && count > this.prevCount) this.beep.beep();
      this.prevCount = count;
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
