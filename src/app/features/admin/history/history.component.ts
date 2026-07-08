/**
 * Historial de caja y pedidos.
 *
 * Dos vistas sobre los mismos pedidos, acotadas por periodo:
 *  · Pedidos: tabla con cada comanda (mesa, artículos, total, estado, cobro).
 *  · Caja: arqueo — total cobrado, desglose por método y lista de cobros.
 * Es la pieza que faltaba para revisar lo ocurrido, más allá de los agregados
 * del Resumen.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { MoneyPipe } from '../../../shared/money.pipe';
import { ORDER_STATUS_UI } from '../../../shared/ui-maps';
import { orderTotal } from '../../../core/domain/entities/entities';
import { ordersInRange, salesByMethod, totalRevenue } from '../../../core/domain/metrics';

type Range = 'hoy' | '7d' | '30d' | 'todo';
type Tab = 'pedidos' | 'caja';

@Component({
  selector: 'app-history',
  imports: [MoneyPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div data-testid="admin-historial">
      <div class="mb-4 flex flex-wrap items-end gap-4">
        <div class="flex-1">
          <h1 class="m-0 font-serif text-[27px] font-semibold">{{ 'admin.history.title' | translate }}</h1>
          <p class="mt-1 mb-0 text-[13px] text-tinta-media">{{ 'admin.history.subtitle' | translate }}</p>
        </div>
        <div class="flex gap-1.5" role="group" aria-label="Periodo">
          @for (r of rangeChips; track r.key) {
            <button
              type="button"
              (click)="range.set(r.key)"
              class="cursor-pointer rounded-full border-none px-3.5 py-2 text-[12px] font-semibold"
              [class]="range() === r.key ? 'bg-tinta text-lino' : 'bg-panal text-tinta-suave'"
            >
              {{ r.label | translate }}
            </button>
          }
        </div>
      </div>

      <!-- Pestañas -->
      <div class="mb-4 flex gap-1.5" role="tablist" aria-label="Vista">
        @for (t of tabs; track t.key) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === t.key"
            (click)="tab.set(t.key)"
            class="cursor-pointer rounded-[10px] border-none px-4 py-2 text-[13px] font-semibold"
            [class]="tab() === t.key ? 'bg-terracota text-lino-calido' : 'bg-panal text-tinta-suave'"
          >
            {{ t.label | translate }}
          </button>
        }
      </div>

      @if (tab() === 'pedidos') {
        @if (orders().length === 0) {
          <div class="rounded-[14px] border-[1.5px] border-dashed border-borde-punteado p-10 text-center text-sm text-tinta-media">
            {{ 'admin.history.no_orders' | translate }}
          </div>
        } @else {
          <div class="overflow-hidden rounded-[14px] border border-borde bg-papel">
            <div class="grid grid-cols-[70px_1fr_90px_110px_110px] gap-2 border-b border-borde bg-panal/60 px-4 py-2.5 text-[11px] font-bold text-tinta-media">
              <span>{{ 'admin.history.col_table' | translate }}</span><span>{{ 'admin.history.col_items' | translate }}</span><span class="text-right">{{ 'admin.history.col_total' | translate }}</span><span>{{ 'admin.history.col_status' | translate }}</span><span>{{ 'admin.history.col_charge' | translate }}</span>
            </div>
            @for (o of orders(); track o.id) {
              <div class="grid grid-cols-[70px_1fr_90px_110px_110px] items-center gap-2 border-b border-panal px-4 py-3 text-[12.5px]">
                <span class="font-bold">{{ o.tableNumber }}</span>
                <span class="min-w-0 truncate text-tinta-suave">{{ itemsSummary(o) }}</span>
                <span class="text-right font-bold tabular-nums">{{ total(o) | money }}</span>
                <span>
                  <span
                    class="rounded-full px-2 py-[3px] text-[10.5px] font-bold"
                    [style.background]="orderUi[o.status].bg"
                    [style.color]="orderUi[o.status].color"
                  >
                          {{ ('order.status.' + o.status) | translate }}
                  </span>
                </span>
                <span>
                  @if (o.paid) {
                    <span class="rounded-full bg-oliva-bg px-2 py-[3px] text-[10.5px] font-bold text-oliva-texto">
                      {{ o.paymentMethod }}
                    </span>
                  } @else {
                    <span class="text-[11px] text-tinta-media">{{ 'admin.history.unpaid' | translate }}</span>
                  }
                </span>
              </div>
            }
          </div>
          <div class="mt-2 text-[11.5px] text-tinta-media">{{ 'admin.history.orders_count' | translate: { count: orders().length } }}</div>
        }
      } @else {
        <!-- Caja / arqueo -->
        <div class="mb-3.5 grid grid-cols-2 gap-3.5 md:grid-cols-3">
          <div class="rounded-[14px] border border-borde bg-papel px-4 py-4">
            <div class="text-[11.5px] font-semibold text-tinta-media">{{ 'admin.history.total_charged' | translate }}</div>
            <div class="mt-1 font-serif text-[26px] font-bold">{{ revenue() | money }}</div>
          </div>
          <div class="rounded-[14px] border border-borde bg-papel px-4 py-4">
            <div class="text-[11.5px] font-semibold text-tinta-media">{{ 'admin.history.charges' | translate }}</div>
            <div class="mt-1 font-serif text-[26px] font-bold">{{ paidCount() }}</div>
          </div>
          <div class="rounded-[14px] border border-borde bg-papel px-4 py-4">
            <div class="text-[11.5px] font-semibold text-tinta-media">{{ 'admin.history.methods_used' | translate }}</div>
            <div class="mt-1 font-serif text-[26px] font-bold">{{ methods().length }}</div>
          </div>
        </div>

        <section class="mb-3.5 rounded-[14px] border border-borde bg-papel px-5 py-[18px]">
          <div class="mb-3 text-[13px] font-semibold">{{ 'admin.history.breakdown' | translate }}</div>
          @if (methods().length === 0) {
            <div class="text-xs text-tinta-media">{{ 'admin.history.no_breakdown' | translate }}</div>
          }
          @for (m of methods(); track m.method) {
            <div class="flex items-center gap-2 border-b border-panal py-2 text-[13px] last:border-0">
              <span class="font-semibold">{{ m.method }}</span>
              <span class="text-tinta-media">· {{ m.count }}</span>
              <span class="flex-1"></span>
              <span class="font-bold tabular-nums">{{ m.total | money }}</span>
            </div>
          }
        </section>

        <section class="rounded-[14px] border border-borde bg-papel px-5 py-[18px]">
          <div class="mb-3 text-[13px] font-semibold">{{ 'admin.history.charges_period' | translate }}</div>
          @if (paidOrders().length === 0) {
            <div class="text-xs text-tinta-media">{{ 'admin.history.no_charges' | translate }}</div>
          }
          @for (o of paidOrders(); track o.id) {
            <div class="flex items-center gap-2 border-b border-panal py-2 text-[12.5px] last:border-0">
              <span class="font-bold">Mesa {{ o.tableNumber }}</span>
              <span class="font-mono text-[11px] text-tinta-media">#{{ o.id }}</span>
              <span class="rounded-full bg-oliva-bg px-2 py-px text-[10.5px] font-bold text-oliva-texto">
                {{ o.paymentMethod }}
              </span>
              <span class="text-[11px] text-tinta-media">{{ o.paidAt }}</span>
              <span class="flex-1"></span>
              <span class="font-bold tabular-nums">{{ total(o) | money }}</span>
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class HistoryComponent {
  protected readonly store = inject(RestaurantStore);
  protected readonly orderUi = ORDER_STATUS_UI;
  protected readonly total = orderTotal;

  protected readonly rangeChips: Array<{ key: Range; label: string }> = [
    { key: 'hoy', label: 'admin.range.hoy' },
    { key: '7d', label: 'admin.range.d7' },
    { key: '30d', label: 'admin.range.d30' },
    { key: 'todo', label: 'admin.range.todo' },
  ];
  protected readonly tabs: Array<{ key: Tab; label: string }> = [
    { key: 'pedidos', label: 'admin.history.tab_orders' },
    { key: 'caja', label: 'admin.history.tab_cash' },
  ];
  protected readonly range = signal<Range>('hoy');
  protected readonly tab = signal<Tab>('pedidos');

  private readonly fromMs = computed(() => {
    const now = Date.now();
    const DAY = 86_400_000;
    switch (this.range()) {
      case 'hoy': {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
      case '7d':
        return now - 7 * DAY;
      case '30d':
        return now - 30 * DAY;
      default:
        return 0;
    }
  });

  /** Pedidos del periodo, más recientes primero. */
  protected readonly orders = computed(() =>
    [...ordersInRange(this.store.orders(), this.fromMs())].sort((a, b) => b.createdAtMs - a.createdAtMs),
  );
  protected readonly paidOrders = computed(() => this.orders().filter((o) => o.paid));
  protected readonly paidCount = computed(() => this.paidOrders().length);
  protected readonly revenue = computed(() => totalRevenue(this.orders()));
  protected readonly methods = computed(() => salesByMethod(this.orders()));

  protected itemsSummary(o: { items: Array<{ quantity: number; productName: string }> }): string {
    return o.items.map((it) => `${it.quantity}× ${it.productName}`).join(', ');
  }
}
