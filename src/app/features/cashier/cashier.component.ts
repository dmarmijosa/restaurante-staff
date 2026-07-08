/**
 * Vista del cajero: cobra los pedidos. Muestra los pedidos sin pagar; el cajero
 * elige el método de pago (los que el admin configuró) y registra el cobro.
 * También lista los cobros del turno para tener referencia.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { AuthService } from '../../core/auth/auth.service';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { initialsOf } from '../../shared/ui-maps';
import { orderTotal } from '../../core/domain/entities/entities';

@Component({
  selector: 'app-cashier',
  imports: [StaffTopbarComponent, MoneyPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col bg-fondo">
      <app-staff-topbar />

      <div class="flex flex-1 items-center justify-center p-3 sm:p-6 lg:p-8">
        <!-- Marco de caja -->
        <div class="w-full max-w-[1120px] rounded-[24px] bg-gradient-to-b from-[#231710] to-[#1A0F08]
                    p-3 shadow-[0_32px_80px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.06)]
                    sm:rounded-[32px] sm:p-4">

          <div class="flex flex-col overflow-hidden rounded-[16px] bg-marfil sm:rounded-[22px]"
               style="min-height: clamp(460px, 70vh, 700px)">

            <!-- Cabecera -->
            <header class="flex flex-none flex-wrap items-center gap-3 border-b border-borde bg-papel/80 px-5 py-3">
              <div class="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-cacao text-[11px] font-bold text-lino shadow-sm">
                {{ initials() }}
              </div>
              <div class="min-w-0">
                <div class="truncate text-[13.5px] font-bold text-tinta">{{ cashierName() }}</div>
                <div class="text-[10.5px] text-tinta-media">{{ 'cashier.shift_label' | translate }}</div>
              </div>
              <div class="flex-1"></div>
              <span class="hidden font-serif text-[14px] font-semibold text-tinta sm:block">{{ store.settings().name }}</span>
              <!-- Total cobrado del turno -->
              <div class="flex items-center gap-2 rounded-[10px] bg-oliva-bg px-3.5 py-2">
                <span class="text-[11px] text-oliva-texto">{{ 'cashier.charged_total_label' | translate }}</span>
                <span class="font-serif text-[15px] font-bold text-oliva-texto">{{ chargedTotal() | money }}</span>
              </div>
            </header>

            <!-- Cuerpo: pedidos | cobros recientes -->
            <div class="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[1fr_260px] lg:grid-cols-[1fr_300px]">

              <!-- Pedidos por cobrar -->
              <section class="overflow-y-auto p-4">
                <div class="mb-3 text-[11px] font-bold uppercase tracking-wider text-tinta-media">
                  {{ 'cashier.orders_title' | translate }}
                </div>

                @if (store.ordersToCharge().length === 0) {
                  <div class="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-borde-punteado p-10 text-center">
                    <svg class="h-10 w-10 text-borde" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="text-[13px] text-tinta-media">{{ 'cashier.no_orders' | translate }}</span>
                  </div>
                }

                <div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                  @for (order of store.ordersToCharge(); track order.id) {
                    <article class="rounded-[14px] border border-borde bg-papel p-4
                                   shadow-[0_1px_6px_rgba(36,26,17,.06)] transition-shadow hover:shadow-[0_4px_14px_rgba(36,26,17,.1)]">
                      <!-- Mesa + total -->
                      <div class="mb-3 flex items-center gap-2">
                        <span class="rounded-[8px] bg-duna px-2.5 py-1 text-[12px] font-bold text-tinta">
                          {{ 'admin.orders.mesa' | translate }} {{ order.tableNumber }}
                        </span>
                        <span class="font-mono text-[11px] text-tinta-media">#{{ order.id }}</span>
                        <span class="flex-1"></span>
                        <span class="font-serif text-[16px] font-bold text-tinta">{{ total(order) | money }}</span>
                      </div>

                      <!-- Items -->
                      <ul class="mb-4 flex list-none flex-col gap-1.5 p-0">
                        @for (item of order.items; track item.productName) {
                          <li class="flex items-baseline gap-1.5 text-[12px] text-tinta-suave">
                            <span class="font-bold text-tinta">{{ item.quantity }}×</span>
                            <span class="flex-1 leading-snug">{{ item.productName }}</span>
                            <span class="font-semibold">{{ item.unitPrice * item.quantity | money }}</span>
                          </li>
                        }
                      </ul>

                      <!-- Métodos de pago -->
                      @if (store.activePaymentMethods().length) {
                        <div class="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-tinta-media">
                          {{ 'cashier.charge_with' | translate }}
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                          @for (method of store.activePaymentMethods(); track method.id) {
                            <button
                              type="button"
                              (click)="charge(order.id, method.name)"
                              class="cursor-pointer rounded-[9px] border-none bg-tinta px-3.5 py-2 text-[12px] font-bold
                                     text-lino shadow-sm transition-all hover:bg-cacao active:scale-95"
                            >
                              {{ method.name }}
                            </button>
                          }
                        </div>
                      } @else {
                        <p class="text-[11.5px] text-rojizo">{{ 'cashier.no_payment_methods' | translate }}</p>
                      }
                    </article>
                  }
                </div>
              </section>

              <!-- Cobros recientes -->
              <aside class="overflow-y-auto border-t border-borde bg-crema/40 p-4 sm:border-t-0 sm:border-l">
                <div class="mb-3 text-[11px] font-bold uppercase tracking-wider text-tinta-media">
                  {{ 'cashier.recent_title' | translate }}
                </div>
                @if (charged().length === 0) {
                  <p class="text-[11.5px] text-tinta-media">{{ 'cashier.no_recent' | translate }}</p>
                }
                <div class="flex flex-col gap-2">
                  @for (order of charged(); track order.id) {
                    <div class="rounded-[11px] border border-borde bg-papel px-3.5 py-3
                                shadow-[0_1px_4px_rgba(36,26,17,.05)]">
                      <div class="flex items-center gap-2">
                        <span class="text-[12.5px] font-bold text-tinta">
                          {{ 'admin.orders.mesa' | translate }} {{ order.tableNumber }}
                        </span>
                        <span class="flex-1"></span>
                        <span class="font-serif text-[13px] font-bold text-tinta">{{ total(order) | money }}</span>
                      </div>
                      <div class="mt-1.5 flex items-center gap-2 text-[10.5px] text-tinta-media">
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
  private translate = inject(TranslateService);

  protected readonly total = orderTotal;
  protected readonly cashierName = computed(() => this.auth.user()?.fullName ?? this.translate.instant('topbar.area.cashier'));
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
