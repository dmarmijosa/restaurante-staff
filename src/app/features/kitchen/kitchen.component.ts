/**
 * Pantalla de cocina: réplica del diseño (fondo cacao, tarjetas grandes de
 * comanda con cabecera ocre/arcilla según estado y un único botón de acción).
 * Cocina solo ve pedidos "recibido" y "preparando" — su trabajo termina cuando
 * el platillo está listo.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';

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

        @if (store.kitchenOrders().length === 0) {
          <div
            class="rounded-[18px] border-2 border-dashed border-lino/20 p-[60px] text-center text-xl text-lino-gris"
          >
            Sin comandas pendientes — todo al día
          </div>
        }

        <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-4">
          @for (order of store.kitchenOrders(); track order.id) {
            <article class="overflow-hidden rounded-2xl bg-marfil">
              <header
                class="flex items-center gap-2.5 px-[18px] py-3.5"
                [style.background]="order.status === 'recibido' ? '#C49A3F' : '#B5764C'"
              >
                <span class="font-serif text-[22px] font-bold text-lino-calido">Mesa {{ order.tableNumber }}</span>
                <span class="flex-1"></span>
                <span class="text-[13px] font-bold text-lino-calido opacity-85">{{ order.createdAt }}</span>
              </header>
              <div class="px-[18px] pt-3.5 pb-4">
                <ul class="mb-4 flex list-none flex-col gap-2 p-0">
                  @for (item of order.items; track item.productName) {
                    <li class="flex gap-2.5 text-[17px] font-semibold text-tinta">
                      <span class="text-arcilla">{{ item.quantity }}×</span>
                      <span>{{ item.productName }}</span>
                    </li>
                  }
                </ul>
                <button
                  type="button"
                  (click)="store.advanceOrder(order.id)"
                  class="w-full cursor-pointer rounded-xl border-none py-[15px] text-base font-bold text-lino-calido hover:opacity-90"
                  [style.background]="order.status === 'recibido' ? '#2C2118' : '#7C905F'"
                >
                  {{ order.status === 'recibido' ? 'Empezar a preparar' : 'Platillo listo' }}
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

  protected readonly countLabel = computed(() => {
    const n = this.store.kitchenOrders().length;
    return n === 1 ? '1 comanda en cola' : `${n} comandas en cola`;
  });

  ngOnInit(): void {
    void this.store.init();
  }
}
