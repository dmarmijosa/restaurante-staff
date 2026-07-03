/**
 * Vista del mesero: réplica del "tablet" del diseño (marco oscuro redondeado,
 * columna de llamadas + mesas y panel de pedidos activos). Las llamadas nacen
 * del menú QR del cliente y los pedidos se avanzan desde aquí o desde cocina.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { AuthService } from '../../core/auth/auth.service';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { ORDER_STATUS_UI, TABLE_STATUS_UI, initialsOf } from '../../shared/ui-maps';
import { orderTotal } from '../../core/domain/entities/entities';

@Component({
  selector: 'app-waiter',
  imports: [StaffTopbarComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-staff-topbar />
      <div class="flex flex-1 items-center justify-center px-6 py-9">
        <div class="w-[1080px] max-w-full rounded-[28px] bg-[#1E150D] p-4 shadow-[0_24px_60px_rgba(36,26,17,.35)]">
          <div class="flex h-[640px] flex-col overflow-hidden rounded-2xl bg-marfil">
            <!-- Cabecera de la tablet -->
            <header class="flex flex-none items-center gap-3 border-b border-borde px-[22px] py-3.5">
              <div
                class="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-avatar-1 text-xs font-bold text-lino-calido"
              >
                {{ initials() }}
              </div>
              <div>
                <div class="text-sm font-bold">{{ waiterName() }}</div>
                <div class="text-[11px] text-tinta-media">Turno de tarde · 14:00–20:00</div>
              </div>
              <div class="flex-1"></div>
              <div class="font-serif text-[15px] font-semibold">{{ store.settings().name }}</div>
              <div class="flex items-center gap-1.5 text-[11.5px] text-tinta-suave">
                <span class="h-2 w-2 rounded-full bg-oliva"></span><span>En línea</span>
              </div>
            </header>

            <div class="grid min-h-0 flex-1 grid-cols-[300px_1fr]">
              <!-- Llamadas + mesas -->
              <aside class="overflow-y-auto border-r border-borde p-[18px]">
                <div class="mb-3 flex items-center gap-2">
                  <span class="text-xs font-bold tracking-[.05em] text-tinta-media">LLAMADAS DE MESA</span>
                  @if (store.pendingCalls().length > 0) {
                    <span class="rounded-full bg-rojizo px-[7px] py-px text-[10.5px] font-bold text-lino-calido">
                      {{ store.pendingCalls().length }}
                    </span>
                  }
                </div>

                @if (store.pendingCalls().length > 0) {
                  <div class="mb-5 flex flex-col gap-2.5">
                    @for (call of store.pendingCalls(); track call.id) {
                      <div class="rounded-xl border border-rojizo-borde bg-rojizo-bg px-3.5 py-3">
                        <div class="mb-[9px] flex items-center gap-2">
                          <span class="animate-pulse-dot h-[9px] w-[9px] rounded-full bg-rojizo"></span>
                          <span class="text-[13.5px] font-bold">Mesa {{ call.tableNumber }} llama</span>
                          <span class="flex-1"></span>
                          <span class="text-[11px] text-tinta-media">{{ call.createdAt }}</span>
                        </div>
                        <button
                          type="button"
                          (click)="store.attendCall(call.id)"
                          class="w-full cursor-pointer rounded-[9px] border-none bg-rojizo py-2 text-xs font-bold text-lino-calido hover:bg-rojizo-hover"
                        >
                          Atender mesa
                        </button>
                      </div>
                    }
                  </div>
                } @else {
                  <div
                    class="mb-5 rounded-xl border-[1.5px] border-dashed border-borde-punteado p-4 text-center text-xs text-tinta-media"
                  >
                    Sin llamadas pendientes
                  </div>
                }

                <div class="mb-3 text-xs font-bold tracking-[.05em] text-tinta-media">MESAS DEL SALÓN</div>
                <div class="grid grid-cols-2 gap-2">
                  @for (table of store.tables(); track table.id) {
                    <div
                      class="flex items-center gap-2 rounded-[10px] border px-[11px] py-[9px]"
                      [class]="table.waiterId === currentId() ? 'border-terracota bg-duna/40' : 'border-borde bg-papel'"
                    >
                      <span class="h-2 w-2 rounded-full" [style.background]="tableUi[table.status].border"></span>
                      <span class="flex-1 text-xs font-semibold">{{ tableLabel(table.number, table.mergedNumbers) }}</span>
                      @if (table.waiterId === currentId()) {
                        <span class="rounded-full bg-terracota px-1.5 py-px text-[9px] font-bold text-lino-calido">Tuya</span>
                      } @else {
                        <span class="text-[10px] text-tinta-media">{{ tableUi[table.status].label }}</span>
                      }
                    </div>
                  }
                </div>
              </aside>

              <!-- Pedidos activos -->
              <section class="overflow-y-auto px-[22px] py-[18px]">
                <div class="mb-3 text-xs font-bold tracking-[.05em] text-tinta-media">PEDIDOS ACTIVOS</div>
                <div class="grid grid-cols-2 items-start gap-3">
                  @for (order of store.activeOrders(); track order.id) {
                    <article class="rounded-xl border border-borde bg-papel px-4 py-3.5">
                      <div class="mb-[9px] flex items-center gap-2">
                        <span class="text-sm font-bold">Mesa {{ order.tableNumber }}</span>
                        <span class="font-mono text-[11px] text-tinta-media">#{{ order.id }}</span>
                        <span class="flex-1"></span>
                        <span
                          class="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
                          [style.background]="orderUi[order.status].bg"
                          [style.color]="orderUi[order.status].color"
                        >
                          {{ orderUi[order.status].label }}
                        </span>
                      </div>
                      <ul class="mb-2.5 flex list-none flex-col gap-1 p-0">
                        @for (item of order.items; track item.productName) {
                          <li class="flex gap-1.5 text-[12.5px] text-tinta-suave">
                            <span class="font-semibold">{{ item.quantity }}×</span>
                            <span class="flex-1">{{ item.productName }}</span>
                            <span>{{ item.unitPrice * item.quantity | money }}</span>
                          </li>
                        }
                      </ul>
                      <div class="flex items-center gap-2.5">
                        <span class="flex-1 text-[13px] font-bold">{{ total(order) | money }}</span>
                        @if (orderUi[order.status].next; as nextLabel) {
                          <button
                            type="button"
                            (click)="store.advanceOrder(order.id)"
                            class="cursor-pointer rounded-[9px] border-none bg-tinta px-3.5 py-2 text-xs font-semibold text-lino hover:bg-cacao-hover"
                          >
                            {{ nextLabel }}
                          </button>
                        }
                      </div>
                    </article>
                  }
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class WaiterComponent implements OnInit {
  protected readonly store = inject(RestaurantStore);
  private auth = inject(AuthService);

  protected readonly tableUi = TABLE_STATUS_UI;
  protected readonly orderUi = ORDER_STATUS_UI;
  protected readonly total = orderTotal;

  protected readonly waiterName = computed(() => this.auth.user()?.fullName ?? 'Mesero');
  protected readonly initials = computed(() => initialsOf(this.waiterName()));
  /** Id del mesero en sesión, para resaltar sus mesas asignadas. */
  protected readonly currentId = computed(() => this.auth.user()?.id ?? null);

  protected tableLabel(num: number, merged: number[] | null): string {
    return merged?.length ? 'Mesas ' + merged.join('+') : 'Mesa ' + num;
  }

  ngOnInit(): void {
    void this.store.init();
  }
}
