/**
 * Vista del mesero: réplica del "tablet" del diseño (marco oscuro redondeado,
 * columna de llamadas + mesas y panel de pedidos activos). Las llamadas nacen
 * del menú QR del cliente y los pedidos se avanzan desde aquí o desde cocina.
 *
 * PWA/offline: cuando el dispositivo no tiene red, muestra un banner amarillo
 * y carga los últimos datos conocidos desde el caché local (localStorage).
 * Al reconectarse, el store se refresca automáticamente y el banner desaparece.
 */
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { AuthService } from '../../core/auth/auth.service';
import { OfflineService } from '../../core/pwa/offline.service';
import { WaiterCacheService } from '../../core/pwa/waiter-cache.service';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { OfflineBannerComponent } from '../../shared/offline-banner/offline-banner.component';
import { ORDER_STATUS_UI, TABLE_STATUS_UI, initialsOf } from '../../shared/ui-maps';
import { OrderCardComponent } from '../../shared/order-card/order-card.component';

@Component({
  selector: 'app-waiter',
  imports: [StaffTopbarComponent, OfflineBannerComponent, OrderCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col bg-fondo">
      <app-staff-topbar />
      <app-offline-banner [fromCache]="usingCache()" [justReconnected]="justReconnected()" />

      <!-- Marco de tablet -->
      <div class="flex flex-1 items-center justify-center p-3 sm:p-6 lg:p-8">
        <div class="w-full max-w-[1120px] rounded-[24px] bg-gradient-to-b from-[#231710] to-[#1A0F08]
                    p-3 shadow-[0_32px_80px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.06)]
                    sm:rounded-[32px] sm:p-4">

          <!-- Pantalla interna -->
          <div class="flex flex-col overflow-hidden rounded-[16px] bg-marfil sm:rounded-[22px]"
               style="min-height: clamp(460px, 70vh, 700px)">

            <!-- Cabecera de la tablet -->
            <header class="flex flex-none items-center gap-3 border-b border-borde bg-papel/80 px-5 py-3">
              <!-- Avatar + nombre mesero -->
              <div class="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-cacao text-[11px] font-bold text-lino shadow-sm">
                {{ initials() }}
              </div>
              <div class="min-w-0">
                <div class="truncate text-[13.5px] font-bold text-tinta">{{ waiterName() }}</div>
                <div class="text-[10.5px] text-tinta-media">{{ 'shift.tarde' | translate }} · 14:00–20:00</div>
              </div>
              <div class="flex-1"></div>
              <!-- Restaurante + indicador de red -->
              <div class="hidden items-center gap-3 sm:flex">
                <span class="font-serif text-[14px] font-semibold text-tinta">{{ store.settings().name }}</span>
                <span
                  class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                  [class]="offline.isOnline() ? 'bg-oliva-bg text-oliva-texto' : 'bg-ocre-bg text-ocre-texto'"
                >
                  <span class="h-1.5 w-1.5 rounded-full"
                        [class]="offline.isOnline() ? 'bg-oliva-texto' : 'bg-ocre-texto'"></span>
                  {{ offline.isOnline() ? ('waiter.online' | translate) : ('pwa.offline_banner' | translate) }}
                </span>
              </div>
            </header>

            <!-- Cuerpo: sidebar izquierda + panel de pedidos -->
            <div class="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr]">

              <!-- Sidebar: llamadas + mesas -->
              <aside class="overflow-y-auto border-b border-borde bg-crema/50 p-4 sm:border-b-0 sm:border-r">

                <!-- Llamadas -->
                <div class="mb-2.5 flex items-center gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-tinta-media">
                    {{ 'waiter.calls_title' | translate }}
                  </span>
                  @if (store.pendingCalls().length > 0) {
                    <span class="rounded-full bg-rojizo px-2 py-px text-[10px] font-bold text-lino-calido">
                      {{ store.pendingCalls().length }}
                    </span>
                  }
                </div>

                @if (store.pendingCalls().length > 0) {
                  <div class="mb-5 flex flex-col gap-2">
                    @for (call of store.pendingCalls(); track call.id) {
                      <div class="rounded-[12px] border border-rojizo-borde bg-rojizo-bg px-3.5 py-3
                                  shadow-[0_1px_4px_rgba(181,73,58,.1)]">
                        <div class="mb-2 flex items-center gap-2">
                          <span class="animate-pulse h-2 w-2 rounded-full bg-rojizo"></span>
                          <span class="flex-1 text-[13px] font-bold text-tinta">
                            {{ 'waiter.table_calls' | translate: { n: call.tableNumber } }}
                          </span>
                          <span class="text-[10.5px] text-tinta-media">{{ call.createdAt }}</span>
                        </div>
                        <button
                          type="button"
                          (click)="store.attendCall(call.id)"
                          [disabled]="!offline.isOnline()"
                          class="w-full cursor-pointer rounded-[9px] border-none bg-rojizo py-2 text-[11.5px] font-bold
                                 text-lino-calido transition-colors hover:bg-rojizo-hover
                                 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {{ 'waiter.attend_btn' | translate }}
                        </button>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="mb-3 rounded-[12px] border border-dashed border-borde-punteado p-4 text-center text-[11.5px] text-tinta-media">
                    {{ 'waiter.no_calls' | translate }}
                  </div>
                }

                @if (store.attendedCalls().length > 0) {
                  <div class="mb-5">
                    <div class="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-tinta-suave">
                      {{ 'waiter.attended_title' | translate }}
                    </div>
                    <div class="flex flex-col gap-1.5">
                      @for (call of store.attendedCalls(); track call.id) {
                        <div class="flex items-center gap-2 rounded-[10px] border border-borde bg-oliva-bg px-3 py-2.5">
                          <span class="text-[12px] text-oliva-texto" aria-hidden="true">✓</span>
                          <span class="flex-1 text-[12px] font-semibold text-oliva-texto">
                            {{ 'waiter.attended_label' | translate: { n: call.tableNumber } }}
                          </span>
                          <span class="text-[10px] text-tinta-media">{{ call.createdAt }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Mesas -->
                <div class="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-tinta-media">
                  {{ 'waiter.tables_title' | translate }}
                </div>
                <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
                  @for (table of store.tables(); track table.id) {
                    <div
                      class="flex items-center gap-2 rounded-[10px] border px-2.5 py-2 transition-colors"
                      [class]="table.waiterId === currentId()
                        ? 'border-terracota/40 bg-duna/60'
                        : 'border-borde bg-papel/70'"
                    >
                      <span
                        class="h-2 w-2 flex-none rounded-full"
                        [style.background]="tableUi[table.status].border"
                      ></span>
                      <span class="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-tinta">
                        {{ tableLabel(table.number, table.mergedNumbers) }}
                      </span>
                      @if (table.waiterId === currentId()) {
                        <span class="rounded-full bg-terracota px-1.5 py-px text-[9px] font-bold text-lino-calido">
                          {{ 'waiter.your_table' | translate }}
                        </span>
                      } @else {
                        <span class="text-[9.5px] text-tinta-media">{{ ('table_status.' + table.status) | translate }}</span>
                      }
                    </div>
                  }
                </div>
              </aside>

              <!-- Panel de pedidos activos -->
              <section class="overflow-y-auto p-4">
                <div class="mb-3 text-[11px] font-bold uppercase tracking-wider text-tinta-media">
                  {{ 'waiter.orders_title' | translate }}
                </div>
                <div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                  @for (order of store.activeOrders(); track order.id) {
                    <app-order-card
                      [order]="order"
                      [showStatus]="true"
                      [disabled]="!offline.isOnline()"
                      [actionLabel]="orderUi[order.status].next
                        ? (('order.status.' + order.status + '_next') | translate)
                        : null"
                      (advance)="store.advanceOrder(order.id)"
                    />
                  }
                  @if (store.activeOrders().length === 0) {
                    <div class="col-span-2 rounded-[14px] border border-dashed border-borde-punteado p-8 text-center text-[12px] text-tinta-media">
                      {{ 'waiter.no_orders' | translate }}
                    </div>
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
export class WaiterComponent implements OnInit, OnDestroy {
  protected readonly store = inject(RestaurantStore);
  protected readonly offline = inject(OfflineService);
  private readonly cache = inject(WaiterCacheService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);

  protected readonly tableUi = TABLE_STATUS_UI;
  protected readonly orderUi = ORDER_STATUS_UI;

  protected readonly waiterName = computed(() => this.auth.user()?.fullName ?? this.translate.instant('topbar.area.waiter'));
  protected readonly initials = computed(() => initialsOf(this.waiterName()));
  protected readonly currentId = computed(() => this.auth.user()?.id ?? null);

  /** Indica si los datos en pantalla provienen del caché local. */
  protected readonly usingCache = signal(false);
  /** Muestra el chip verde de reconexión por 3 segundos. */
  protected readonly justReconnected = signal(false);

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Guarda snapshot cada vez que mesas u órdenes cambian (solo si tiene datos).
    effect(() => {
      const tables = this.store.tables();
      const orders = this.store.orders();
      const calls = this.store.calls();
      if (tables.length > 0 && this.offline.isOnline()) {
        this.cache.save(tables, orders, calls);
        if (this.usingCache()) {
          this.usingCache.set(false);
        }
      }
    });

    // Al reconectarse: refresca el store y muestra el mensaje brevemente.
    effect(() => {
      if (this.offline.isOnline()) {
        if (this.usingCache()) {
          void this.store.init();
          this.justReconnected.set(true);
          this.reconnectTimer = setTimeout(() => this.justReconnected.set(false), 3000);
        }
      }
    });
  }

  protected tableLabel(num: number, merged: number[] | null): string {
    return merged?.length
      ? `${this.translate.instant('admin.floor_plan.tables')} ${merged.join('+')}`
      : `${this.translate.instant('admin.orders.mesa')} ${num}`;
  }

  async ngOnInit(): Promise<void> {
    if (!this.auth.ready()) {
      await this.auth.restoreSession();
    }

    if (!this.offline.isOnline()) {
      // Sin red: intentamos cargar el caché para no mostrar la pantalla vacía.
      const snapshot = this.cache.load();
      if (snapshot) {
        this.store.tables.set(snapshot.tables);
        this.store.orders.set(snapshot.orders);
        this.store.calls.set(snapshot.calls);
        this.usingCache.set(true);
      }
    } else {
      await this.store.init();
      await this.store.refreshOperationalData();
    }
  }

  ngOnDestroy(): void {
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
  }
}
