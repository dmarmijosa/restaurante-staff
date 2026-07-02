/**
 * Vista del cajero: cobra los pedidos. Muestra los pedidos sin pagar; el cajero
 * elige el método de pago (los que el admin configuró) y registra el cobro.
 * También lista los cobros del turno para tener referencia.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { AuthService } from '../../core/auth/auth.service';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { initialsOf } from '../../shared/ui-maps';
import { orderTotal } from '../../core/domain/entities/entities';

@Component({
  selector: 'app-cashier',
  imports: [StaffTopbarComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-staff-topbar />
      <div class="flex flex-1 items-center justify-center px-6 py-9">
        <div class="w-[1080px] max-w-full rounded-[28px] bg-[#1E150D] p-4 shadow-[0_24px_60px_rgba(36,26,17,.35)]">
          <div class="flex h-[640px] flex-col overflow-hidden rounded-2xl bg-marfil">
            <!-- Cabecera -->
            <header class="flex flex-none items-center gap-3 border-b border-borde px-[22px] py-3.5">
              <div class="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-avatar-5 text-xs font-bold text-lino-calido">
                {{ initials() }}
              </div>
              <div>
                <div class="text-sm font-bold">{{ cashierName() }}</div>
                <div class="text-[11px] text-tinta-media">Caja · cobros del turno</div>
              </div>
              <div class="flex-1"></div>
              <div class="font-serif text-[15px] font-semibold">{{ store.settings().name }}</div>
              <div class="rounded-full bg-oliva-bg px-3 py-1 text-[11.5px] font-bold text-oliva-texto">
                Cobrado: {{ chargedTotal() | money }}
              </div>
            </header>

            <div class="grid min-h-0 flex-1 grid-cols-[1fr_300px]">
              <!-- Pedidos por cobrar -->
              <section class="overflow-y-auto px-[22px] py-[18px]">
                <div class="mb-3 text-xs font-bold tracking-[.05em] text-tinta-media">PEDIDOS POR COBRAR</div>
                @if (store.ordersToCharge().length === 0) {
                  <div class="rounded-xl border-[1.5px] border-dashed border-borde-punteado p-8 text-center text-sm text-tinta-media">
                    No hay pedidos pendientes de cobro
                  </div>
                }
                <div class="grid grid-cols-2 items-start gap-3">
                  @for (order of store.ordersToCharge(); track order.id) {
                    <article class="rounded-xl border border-borde bg-papel px-4 py-3.5">
                      <div class="mb-2 flex items-center gap-2">
                        <span class="text-sm font-bold">Mesa {{ order.tableNumber }}</span>
                        <span class="font-mono text-[11px] text-tinta-media">#{{ order.id }}</span>
                        <span class="flex-1"></span>
                        <span class="text-[13px] font-bold">{{ total(order) | money }}</span>
                      </div>
                      <ul class="mb-3 flex list-none flex-col gap-1 p-0">
                        @for (item of order.items; track item.productName) {
                          <li class="flex gap-1.5 text-[12.5px] text-tinta-suave">
                            <span class="font-semibold">{{ item.quantity }}×</span>
                            <span class="flex-1">{{ item.productName }}</span>
                            <span>{{ item.unitPrice * item.quantity | money }}</span>
                          </li>
                        }
                      </ul>
                      @if (store.activePaymentMethods().length) {
                        <div class="mb-1 text-[10.5px] font-semibold text-tinta-media">COBRAR CON</div>
                        <div class="flex flex-wrap gap-1.5">
                          @for (method of store.activePaymentMethods(); track method.id) {
                            <button
                              type="button"
                              (click)="charge(order.id, method.name)"
                              class="cursor-pointer rounded-[9px] border-none bg-tinta px-3 py-2 text-xs font-bold text-lino hover:bg-cacao-hover"
                            >
                              {{ method.name }}
                            </button>
                          }
                        </div>
                      } @else {
                        <div class="text-[11.5px] text-rojizo">
                          El administrador aún no configuró métodos de pago.
                        </div>
                      }
                    </article>
                  }
                </div>
              </section>

              <!-- Cobros recientes -->
              <aside class="overflow-y-auto border-l border-borde p-[18px]">
                <div class="mb-3 text-xs font-bold tracking-[.05em] text-tinta-media">COBROS RECIENTES</div>
                @if (charged().length === 0) {
                  <div class="text-xs text-tinta-media">Sin cobros todavía.</div>
                }
                <div class="flex flex-col gap-2">
                  @for (order of charged(); track order.id) {
                    <div class="rounded-[10px] border border-borde bg-papel px-3 py-2.5">
                      <div class="flex items-center gap-2">
                        <span class="text-[12.5px] font-bold">Mesa {{ order.tableNumber }}</span>
                        <span class="flex-1"></span>
                        <span class="text-[12.5px] font-bold">{{ total(order) | money }}</span>
                      </div>
                      <div class="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-tinta-media">
                        <span class="rounded-full bg-oliva-bg px-2 py-px font-semibold text-oliva-texto">
                          {{ order.paymentMethod }}
                        </span>
                        <span>{{ order.paidAt }}</span>
                      </div>
                    </div>
                  }
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CashierComponent implements OnInit {
  protected readonly store = inject(RestaurantStore);
  private auth = inject(AuthService);

  protected readonly total = orderTotal;
  protected readonly cashierName = computed(() => this.auth.user()?.fullName ?? 'Cajero');
  protected readonly initials = computed(() => initialsOf(this.cashierName()));

  protected readonly charged = computed(() => this.store.orders().filter((o) => o.paid));
  protected readonly chargedTotal = computed(() =>
    this.charged().reduce((acc, o) => acc + orderTotal(o), 0),
  );

  ngOnInit(): void {
    void this.store.init();
  }

  protected charge(orderId: number, method: string): void {
    void this.store.chargeOrder(orderId, method);
  }
}
