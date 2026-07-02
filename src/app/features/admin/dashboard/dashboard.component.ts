/**
 * Resumen del restaurante: métricas de un vistazo para el administrador.
 * Ingresos cobrados, ticket medio, nº de pedidos, ventas por método de pago y
 * productos más vendidos. Usa barras CSS (sin librerías) para no añadir peso y
 * mantener la identidad terracota/crema.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { MoneyPipe } from '../../../shared/money.pipe';
import { averageTicket, salesByMethod, topProducts, totalRevenue } from '../../../core/domain/metrics';

@Component({
  selector: 'app-dashboard',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div data-testid="admin-resumen">
      <div class="mb-[18px]">
        <h1 class="m-0 font-serif text-[27px] font-semibold">Resumen</h1>
        <p class="mt-1 mb-0 text-[13px] text-tinta-media">
          Cómo va el servicio hoy: ingresos, cobros por método y lo que más se pide.
        </p>
      </div>

      <!-- Tarjetas de indicadores -->
      <div class="mb-4 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        @for (kpi of kpis(); track kpi.label) {
          <div class="rounded-[14px] border border-borde bg-papel px-4 py-4">
            <div class="text-[11.5px] font-semibold text-tinta-media">{{ kpi.label }}</div>
            <div class="mt-1 font-serif text-[26px] font-bold">{{ kpi.value }}</div>
            <div class="mt-0.5 text-[11px] text-tinta-media">{{ kpi.hint }}</div>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <!-- Ventas por método de pago -->
        <section class="rounded-[14px] border border-borde bg-papel px-5 py-[18px]">
          <div class="mb-3.5 text-[13px] font-semibold">Ventas por método de pago</div>
          @if (methods().length === 0) {
            <div class="rounded-[10px] border-[1.5px] border-dashed border-borde-punteado p-6 text-center text-xs text-tinta-media">
              Aún no hay cobros registrados.
            </div>
          }
          <div class="flex flex-col gap-3">
            @for (m of methods(); track m.method) {
              <div>
                <div class="mb-1 flex items-baseline gap-2 text-[12.5px]">
                  <span class="font-semibold">{{ m.method }}</span>
                  <span class="text-tinta-media">· {{ m.count }} {{ m.count === 1 ? 'cobro' : 'cobros' }}</span>
                  <span class="flex-1"></span>
                  <span class="font-bold">{{ m.total | money }}</span>
                </div>
                <div class="h-2.5 overflow-hidden rounded-full bg-panal">
                  <div class="h-full rounded-full bg-terracota" [style.width.%]="pct(m.total, maxMethodTotal())"></div>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Productos más vendidos -->
        <section class="rounded-[14px] border border-borde bg-papel px-5 py-[18px]">
          <div class="mb-3.5 text-[13px] font-semibold">Productos más vendidos</div>
          @if (products().length === 0) {
            <div class="rounded-[10px] border-[1.5px] border-dashed border-borde-punteado p-6 text-center text-xs text-tinta-media">
              Todavía no hay pedidos.
            </div>
          }
          <div class="flex flex-col gap-3">
            @for (p of products(); track p.name) {
              <div>
                <div class="mb-1 flex items-baseline gap-2 text-[12.5px]">
                  <span class="font-semibold">{{ p.name }}</span>
                  <span class="flex-1"></span>
                  <span class="text-tinta-media">{{ p.quantity }} uds · {{ p.revenue | money }}</span>
                </div>
                <div class="h-2.5 overflow-hidden rounded-full bg-panal">
                  <div class="h-full rounded-full bg-oliva" [style.width.%]="pct(p.quantity, maxProductQty())"></div>
                </div>
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  protected readonly store = inject(RestaurantStore);

  private readonly orders = computed(() => this.store.orders());

  protected readonly methods = computed(() => salesByMethod(this.orders()));
  protected readonly products = computed(() => topProducts(this.orders()));

  protected readonly maxMethodTotal = computed(() =>
    Math.max(1, ...this.methods().map((m) => m.total)),
  );
  protected readonly maxProductQty = computed(() =>
    Math.max(1, ...this.products().map((p) => p.quantity)),
  );

  protected readonly kpis = computed(() => {
    const orders = this.orders();
    const paid = orders.filter((o) => o.paid).length;
    const pending = orders.filter((o) => !o.paid).length;
    const money = (n: number) => '$' + n.toFixed(2);
    return [
      { label: 'INGRESOS COBRADOS', value: money(totalRevenue(orders)), hint: paid + ' pedidos cobrados' },
      { label: 'TICKET MEDIO', value: money(averageTicket(orders)), hint: 'por pedido cobrado' },
      { label: 'PEDIDOS', value: String(orders.length), hint: paid + ' cobrados · ' + pending + ' pendientes' },
      { label: 'POR COBRAR', value: String(pending), hint: 'pedidos sin pagar' },
    ];
  });

  protected pct(value: number, max: number): number {
    return Math.round((value / max) * 100);
  }
}
