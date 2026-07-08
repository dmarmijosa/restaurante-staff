/**
 * Tablero de pedidos del admin: cuatro columnas (Recibido → Preparando →
 * Listo → Entregado) con tarjetas de comanda y botón para avanzar de estado,
 * como el kanban del diseño.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { ORDER_STATUS_UI } from '../../../shared/ui-maps';
import { OrderCardComponent } from '../../../shared/order-card/order-card.component';
import type { OrderStatus } from '../../../core/domain/entities/entities';

const COLUMNS: OrderStatus[] = ['recibido', 'preparando', 'listo', 'entregado'];

@Component({
  selector: 'app-orders-board',
  imports: [TranslatePipe, OrderCardComponent],
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
                <app-order-card
                  [order]="order"
                  [showMeta]="true"
                  [actionFull]="true"
                  [actionLabel]="order.status !== 'entregado'
                    ? (('order.status.' + order.status + '_next') | translate)
                    : null"
                  (advance)="store.advanceOrder(order.id)"
                />
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

  protected readonly columns = computed(() =>
    COLUMNS.map((status) => ({
      status,
      orders: this.store.orders().filter((o) => o.status === status),
    })),
  );
}
