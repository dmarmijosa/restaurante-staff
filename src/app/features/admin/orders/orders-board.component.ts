/**
 * Tablero de pedidos del admin: cuatro columnas (Recibido → Preparando →
 * Listo → Entregado) con tarjetas de comanda y botón para avanzar de estado,
 * como el kanban del diseño.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { MoneyPipe } from '../../../shared/money.pipe';
import { ORDER_STATUS_UI } from '../../../shared/ui-maps';
import { orderTotal, type OrderStatus } from '../../../core/domain/entities/entities';

const COLUMNS: OrderStatus[] = ['recibido', 'preparando', 'listo', 'entregado'];

@Component({
  selector: 'app-orders-board',
  imports: [MoneyPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div data-testid="admin-pedidos">
      <div class="mb-[18px]">
        <h1 class="m-0 font-serif text-[27px] font-semibold">{{ 'admin.orders.title' | translate }}</h1>
        <p class="mt-1 mb-0 text-[13px] text-tinta-media">{{ 'admin.orders.subtitle' | translate }}</p>
      </div>
      <div class="grid grid-cols-4 items-start gap-3.5">
        @for (column of columns(); track column.status) {
          <section class="min-h-[220px] rounded-[14px] bg-panal p-3">
            <div class="flex items-center gap-[7px] px-1 pt-0.5 pb-2.5">
              <span class="h-2 w-2 rounded-full" [style.background]="orderUi[column.status].dot"></span>
              <span class="text-[12.5px] font-bold">{{ ('order.status.' + column.status) | translate }}</span>
              <span class="text-[11.5px] text-tinta-media">{{ column.orders.length }}</span>
            </div>
            <div class="flex flex-col gap-2.5">
              @for (order of column.orders; track order.id) {
                <article class="rounded-xl border border-borde bg-papel px-3.5 py-3">
                  <div class="mb-2 flex items-baseline gap-2">
                    <span class="text-[13.5px] font-bold">{{ 'admin.orders.mesa' | translate }} {{ order.tableNumber }}</span>
                    <span class="font-mono text-[11px] text-tinta-media">#{{ order.id }}</span>
                    <span class="flex-1"></span>
                    <span class="text-[11px] text-tinta-media">{{ order.createdAt }}</span>
                  </div>
                  <ul class="mb-2 flex list-none flex-col gap-1 p-0">
                    @for (item of order.items; track item.productName) {
                      <li class="flex gap-1.5 text-xs text-tinta-suave">
                        <span class="font-semibold">{{ item.quantity }}×</span>
                        <span class="flex-1">{{ item.productName }}</span>
                        <span>{{ item.unitPrice * item.quantity | money }}</span>
                      </li>
                    }
                  </ul>
                  <div class="mb-2 flex justify-between border-t border-panal pt-2 text-[12.5px]">
                    <span class="text-tinta-media">{{ order.waiterName }}</span>
                    <span class="font-bold">{{ total(order) | money }}</span>
                  </div>
                  @if (order.status !== 'entregado') {
                    <button
                      type="button"
                      (click)="store.advanceOrder(order.id)"
                      class="w-full cursor-pointer rounded-[9px] border-none bg-tinta py-2 text-xs font-semibold text-lino hover:bg-cacao-hover"
                    >
                      {{ ('order.status.' + order.status + '_next') | translate }}
                    </button>
                  }
                </article>
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
})
export class OrdersBoardComponent {
  protected readonly store = inject(RestaurantStore);
  protected readonly orderUi = ORDER_STATUS_UI;
  protected readonly total = orderTotal;

  protected readonly columns = computed(() =>
    COLUMNS.map((status) => ({
      status,
      orders: this.store.orders().filter((o) => o.status === status),
    })),
  );
}
