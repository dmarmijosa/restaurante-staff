/**
 * Home pública de la app = vista del cliente del diseño (menú QR).
 *
 * Soporta dos modos:
 *  - Ruta `/r/:slug/mesa/:numero` (multi-tenant): resuelve el slug al
 *    restaurant_id y lo pasa al store antes de cargar los datos.
 *  - Rutas `/` y `/mesa/:numero` (demo / mono-tenant): usa el contexto ya
 *    establecido por el auth service o el restaurante demo en memoria.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { RestaurantContextService } from '../../core/application/restaurant-context.service';
import { RestaurantRepository } from '../../core/domain/repositories/repositories';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { ChipBtnDirective } from '../../shared/chip-btn.directive';
import { isSupabaseConfigured } from '../../core/data/supabase/runtime-config';
import type { OrderStatus, Product } from '../../core/domain/entities/entities';

type ClientScreen = 'menu' | 'cart' | 'status';

interface CartLine {
  product: Product;
  qty: number;
}

const STEP_DEFS: Array<{ key: OrderStatus; label: string; desc: string }> = [
  { key: 'recibido', label: 'Pedido recibido', desc: 'El restaurante confirmó tu pedido.' },
  { key: 'preparando', label: 'En preparación', desc: 'Cocina está preparando tus platillos.' },
  { key: 'listo', label: 'Listo para servir', desc: 'Tu mesero lo llevará a la mesa.' },
  { key: 'entregado', label: 'Entregado', desc: '¡Buen provecho!' },
];

@Component({
  selector: 'app-client-home',
  imports: [MoneyPipe, RouterLink, TranslatePipe, ChipBtnDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh' },
  template: `
    <div class="min-h-dvh bg-marfil md:flex md:items-start md:justify-center md:bg-gradient-to-br md:from-duna md:via-crema md:to-lino-calido/60 md:px-4 md:py-10">
    <!-- Móvil: scroll de página entera (fiable en Chrome). Desktop: frame tipo teléfono. -->
    <div class="mx-auto flex w-full max-w-[430px] flex-col bg-marfil
                min-h-dvh
                md:min-h-0 md:max-h-[min(900px,92dvh)] md:overflow-hidden md:rounded-[28px]
                md:shadow-[0_32px_80px_rgba(36,26,17,.22),0_0_0_1px_rgba(36,26,17,.07)]">

        <!-- Cabecera -->
        <header class="sticky top-0 z-20 relative flex-none overflow-hidden bg-marfil/95 px-5 pt-[max(2.25rem,env(safe-area-inset-top))] pb-3 backdrop-blur-sm">
          <!-- Fondo de cabecera -->
          <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-duna/70 to-transparent"></div>
          <!-- Logo + nombre -->
          <div class="relative mb-3 flex items-center gap-3">
            @if (store.settings().logoUrl; as logo) {
              <img
                [src]="logo"
                alt="Logo del restaurante"
                class="h-9 w-9 flex-none rounded-[10px] object-cover shadow-sm ring-1 ring-borde-suave"
              />
            } @else {
              <div
                class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-terracota shadow-sm font-serif text-[15px] font-bold text-lino-calido"
              >
                {{ store.settings().name.charAt(0) }}
              </div>
            }
            <h1 class="m-0 flex-1 font-serif text-[22px] font-semibold leading-tight text-tinta">
              {{ store.settings().name }}
            </h1>
          </div>
          <!-- Mesa + llamar mesero -->
          <div class="relative flex items-center gap-2">
            <span class="rounded-full bg-terracota/10 px-3 py-1 text-[11.5px] font-bold text-terracota-profundo ring-1 ring-terracota/20">
              {{ 'admin.orders.mesa' | translate }} {{ mesa() }}
            </span>
            <span class="flex-1 text-[10.5px] text-tinta-media">{{ 'client.via_qr' | translate }}</span>
            <button
              type="button"
              (click)="callWaiter()"
              class="cursor-pointer rounded-full border-none px-[14px] py-[7px] text-[11.5px] font-bold transition-all duration-200"
              [class]="callSent()
                ? 'bg-oliva-bg text-oliva-texto shadow-none'
                : 'bg-cacao text-lino shadow-[0_2px_8px_rgba(36,26,17,.2)] active:scale-95'"
              data-testid="call-waiter-button"
            >
              {{ callSent() ? ('client.waiter_notified' | translate) : ('client.call_waiter' | translate) }}
            </button>
          </div>
        </header>

        <!-- Divisor sutil -->
        <div class="mx-5 h-px bg-gradient-to-r from-transparent via-borde-suave to-transparent"></div>

        <!-- Cerrado por temporada -->
        @if (!store.acceptingOrders()) {
          <div class="flex flex-1 flex-col items-center justify-center gap-4 px-9 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-duna text-3xl">
              🌙
            </div>
            <div class="font-serif text-[26px] leading-tight font-semibold">{{ 'client.closed_season_title' | translate }}</div>
            <div class="text-[13.5px] leading-relaxed text-tinta-media">
              {{ 'client.closed_season_msg' | translate }}
            </div>
          </div>
        } @else {
          <div class="flex flex-col md:min-h-0 md:flex-1">
          @switch (screen()) {
            @case ('menu') {
              <div class="relative flex flex-col md:min-h-0 md:flex-1">
              <!-- Chips de categorías con fade lateral -->
              <div class="relative flex-none pt-3 pb-2.5">
                <div class="flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  @for (cat of catChips(); track cat) {
                    <button
                      chipBtn
                      variant="cacao"
                      [active]="activeCat() === cat"
                      type="button"
                      (click)="activeCat.set(cat)"
                      class="px-3.5 py-[7px] text-xs whitespace-nowrap transition-all duration-150"
                    >
                      {{ cat === '__all__' ? ('client.category_all' | translate) : cat }}
                    </button>
                  }
                </div>
                <!-- Fade izquierda/derecha para indicar scroll -->
                <div class="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-marfil to-transparent"></div>
                <div class="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-marfil to-transparent"></div>
              </div>

              <!-- Banner de pedido activo -->
              @if (myOrder(); as order) {
                <button
                  type="button"
                  (click)="screen.set('status')"
                  class="mx-5 mb-3 flex cursor-pointer items-center gap-2 rounded-[12px] border-none
                         bg-gradient-to-r from-terracota/10 to-duna px-4 py-2.5 text-left
                         ring-1 ring-terracota/20 transition-all duration-150 active:scale-[0.99]"
                >
                  <span class="flex h-2 w-2 rounded-full bg-terracota ring-2 ring-terracota/30"></span>
                  <span class="flex-1 text-[12px] font-semibold text-terracota-profundo">
                    {{ 'client.follow_order' | translate }} #{{ order.id }} · {{ statusLabel(order.status) }}
                  </span>
                  <span class="text-[12px] text-terracota-profundo">→</span>
                </button>
              }

              <!-- Productos: en móvil fluyen con la página; en desktop scroll interno -->
              <main
                class="px-5 pt-0 pb-[calc(11rem+env(safe-area-inset-bottom,0px))]
                       md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pb-36"
              >
                @for (product of visibleProducts(); track product.id) {
                  <article
                    class="mb-2 flex gap-3 rounded-[16px] border border-borde-suave bg-papel p-3
                           shadow-[0_1px_4px_rgba(36,26,17,.06)] transition-shadow duration-150
                           hover:shadow-[0_4px_12px_rgba(36,26,17,.1)]"
                  >
                    <!-- Imagen del producto -->
                    @if (product.imageUrl) {
                      <img
                        [src]="product.imageUrl"
                        [alt]="'Foto de ' + product.name"
                        class="h-[72px] w-[72px] flex-none rounded-[11px] object-cover"
                      />
                    } @else {
                      <div
                        class="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-[11px] bg-gradient-to-br from-panal to-duna/60"
                        aria-hidden="true"
                      >
                        <svg class="h-7 w-7 text-borde" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-4C6.48 4 2 8.48 2 14h20c0-5.52-4.48-10-10-10z"/>
                        </svg>
                      </div>
                    }
                    <!-- Nombre, descripción, precio -->
                    <div class="flex min-w-0 flex-1 flex-col justify-between gap-0.5 py-0.5">
                      <div class="text-[13.5px] font-semibold leading-snug text-tinta">{{ product.name }}</div>
                      <div class="line-clamp-2 text-[11px] leading-snug text-tinta-media">{{ product.description }}</div>
                      <div class="text-[13px] font-bold text-terracota-profundo">{{ product.price | money }}</div>
                    </div>
                    <!-- Controles de cantidad -->
                    <div class="flex flex-col items-center justify-center gap-1.5">
                      @if (qtyOf(product.id) > 0) {
                        <div class="flex items-center gap-1.5 rounded-full bg-panal px-1 py-0.5">
                          <button
                            type="button"
                            (click)="decFromCart(product.id)"
                            class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-papel text-[15px] font-bold text-tinta shadow-sm transition-all active:scale-90"
                            [attr.aria-label]="'Quitar ' + product.name"
                          >−</button>
                          <span class="min-w-5 text-center text-[13px] font-bold text-tinta">{{ qtyOf(product.id) }}</span>
                          <button
                            type="button"
                            (click)="addToCart(product)"
                            class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-terracota text-[15px] font-bold text-lino-calido shadow-sm transition-all active:scale-90"
                            [attr.aria-label]="'Agregar ' + product.name"
                          >+</button>
                        </div>
                      } @else {
                        <button
                          type="button"
                          (click)="addToCart(product)"
                          class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-terracota text-[19px] font-bold text-lino-calido
                                 shadow-[0_2px_8px_rgba(193,104,60,.35)] transition-all duration-150 hover:bg-terracota-hover active:scale-90"
                          [attr.aria-label]="'Agregar ' + product.name"
                          [attr.data-testid]="'add-to-cart-' + product.id"
                        >+</button>
                      }
                    </div>
                  </article>
                }
              </main>

              <!-- Barra flotante del carrito con backdrop-blur -->
              @if (cartCount() > 0) {
                <div
                  class="fixed inset-x-0 z-30 mx-auto max-w-[430px] px-4
                         bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]
                         md:absolute md:inset-x-4 md:bottom-[68px] md:left-4 md:right-4"
                >
                  <button
                    type="button"
                    (click)="screen.set('cart')"
                    class="flex w-full cursor-pointer items-center gap-3 rounded-[16px] border-none
                           bg-cacao/95 px-5 py-[14px] text-lino backdrop-blur-sm
                           shadow-[0_16px_40px_rgba(36,26,17,.4)] transition-all duration-150
                           hover:bg-cacao active:scale-[0.99]"
                    data-testid="cart-bar-button"
                  >
                    <span class="flex h-6 min-w-6 items-center justify-center rounded-full bg-terracota text-[11px] font-bold text-lino-calido">
                      {{ cartCount() }}
                    </span>
                    <span class="flex-1 text-left text-[13px] font-bold">{{ 'client.cart_title' | translate }}</span>
                    <span class="text-[13px] font-bold">{{ cartTotal() | money }}</span>
                    <span class="text-[13px] opacity-70">→</span>
                  </button>
                </div>
              }
              </div>
            }

            @case ('cart') {
              <div class="flex min-h-0 flex-1 flex-col px-5">
                <!-- Cabecera del carrito -->
                <div class="flex items-center gap-3 pt-3 pb-4">
                  <button
                    type="button"
                    (click)="screen.set('menu')"
                    class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-panal text-tinta transition-colors hover:bg-duna"
                    aria-label="Volver al menú"
                  >
                    ←
                  </button>
                  <h2 class="m-0 font-serif text-[20px] font-semibold" data-testid="cart-heading">
                    {{ 'client.cart_title' | translate }}
                  </h2>
                </div>

                <!-- Líneas del carrito -->
                <div class="flex flex-1 flex-col gap-2 overflow-y-auto pb-4">
                  @for (line of cart(); track line.product.id) {
                    <div
                      class="flex items-center gap-3 rounded-[14px] border border-borde-suave bg-papel px-4 py-3
                             shadow-[0_1px_4px_rgba(36,26,17,.05)]"
                    >
                      <div class="min-w-0 flex-1">
                        <div class="text-[13px] font-semibold text-tinta">{{ line.product.name }}</div>
                        <div class="text-[11.5px] text-tinta-media">{{ line.product.price | money }} c/u</div>
                      </div>
                      <div class="flex items-center gap-1.5 rounded-full bg-panal px-1 py-0.5">
                        <button
                          type="button"
                          (click)="decFromCart(line.product.id)"
                          class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-papel text-[15px] font-bold text-tinta shadow-sm transition-all active:scale-90"
                        >−</button>
                        <span class="min-w-5 text-center text-[13px] font-bold text-tinta">{{ line.qty }}</span>
                        <button
                          type="button"
                          (click)="addToCart(line.product)"
                          class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-terracota text-[15px] font-bold text-lino-calido shadow-sm transition-all active:scale-90"
                        >+</button>
                      </div>
                    </div>
                  }
                </div>

                <!-- Total + botón de pedido -->
                <div class="flex-none border-t border-borde pb-8 pt-4">
                  <div class="mb-4 flex items-center justify-between">
                    <span class="text-[13.5px] text-tinta-media">{{ 'admin.history.total' | translate }}</span>
                    <span class="font-serif text-[20px] font-bold text-tinta">{{ cartTotal() | money }}</span>
                  </div>
                  <button
                    type="button"
                    (click)="placeOrder()"
                    [disabled]="cartCount() === 0"
                    class="w-full cursor-pointer rounded-[14px] border-none bg-terracota py-4 text-[15px] font-bold text-lino-calido
                           shadow-[0_4px_16px_rgba(193,104,60,.4)] transition-all duration-150
                           hover:bg-terracota-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    data-testid="submit-order-button"
                  >
                    {{ 'client.cart_send' | translate }}
                  </button>
                </div>
              </div>
            }

            @case ('status') {
              <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4 pb-8">
                <h2 class="m-0 mb-1 font-serif text-[24px] font-semibold text-tinta" data-testid="order-sent-heading">
                  {{ 'client.order_sent_title' | translate }}
                </h2>
                @if (myOrder(); as order) {
                  <p class="mb-6 text-[12.5px] text-tinta-media">
                    {{ 'client.follow_order' | translate }} #{{ order.id }} ·
                    {{ 'admin.orders.mesa' | translate }} {{ mesa() }} ·
                    {{ orderTotalOf(order) | money }}
                  </p>

                  <!-- Stepper de estado -->
                  <div class="mb-6 flex flex-col">
                    @for (step of statusSteps(); track step.key; let last = $last) {
                      <div class="flex gap-4">
                        <!-- Círculo + línea -->
                        <div class="flex flex-col items-center">
                          <div
                            class="flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-[12px] font-bold transition-all duration-300"
                            [class]="step.done
                              ? 'border-terracota bg-terracota text-lino-calido shadow-[0_2px_8px_rgba(193,104,60,.3)]'
                              : 'border-borde bg-papel text-tinta-media'"
                          >
                            {{ step.done ? '✓' : '' }}
                          </div>
                          @if (!last) {
                            <div
                              class="w-0.5 flex-1 min-h-[28px] transition-all duration-500"
                              [class]="step.lineDone ? 'bg-terracota' : 'bg-borde-suave'"
                            ></div>
                          }
                        </div>
                        <!-- Texto -->
                        <div class="pb-6">
                          <div
                            class="text-[13.5px] font-semibold transition-colors duration-300"
                            [class]="step.done ? 'text-tinta' : 'text-tinta-media'"
                          >{{ step.label }}</div>
                          <div class="mt-0.5 text-[11.5px] text-tinta-media">{{ step.desc }}</div>
                        </div>
                      </div>
                    }
                  </div>
                }
                <button
                  type="button"
                  (click)="screen.set('menu')"
                  class="cursor-pointer rounded-[14px] border-[1.5px] border-borde bg-transparent py-3 text-[13px] font-bold text-tinta
                         transition-colors hover:bg-panal"
                >
                  ← {{ 'client.cart_back' | translate }}
                </button>
              </div>
            }
          }
          </div>
        }

        <!-- Footer -->
        <footer class="mt-auto flex-none border-t border-borde-suave bg-gradient-to-b from-marfil to-crema px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          @if (isDemoMode) {
            <div class="mb-3 flex items-center gap-2 rounded-[12px] bg-ocre-bg px-3.5 py-2.5 ring-1 ring-ocre-bg/50">
              <span class="text-[11px] leading-snug text-ocre-texto">
                <strong>Modo demo</strong> — los datos no se guardan.
              </span>
              <a
                routerLink="/instalacion"
                class="ml-auto whitespace-nowrap rounded-[8px] border-none bg-terracota px-3 py-1.5 text-[11px] font-bold text-lino-calido
                       shadow-sm transition-colors hover:bg-terracota-hover"
              >
                Configurar →
              </a>
            </div>
          }
          <div class="flex items-center gap-2.5">
            <div class="flex-1 text-[10.5px] leading-relaxed text-tinta-media">
              <span class="font-semibold">{{ store.settings().name }}</span> · Restaurante Staff
            </div>
            <a
              routerLink="/login"
              data-testid="staff-login-link"
              class="rounded-full border border-borde px-3.5 py-1.5 text-[11.5px] font-semibold text-tinta-suave
                     transition-colors hover:bg-panal"
            >
              {{ 'client.footer_access' | translate }} →
            </a>
          </div>
        </footer>
      </div>
    </div>
  `,
})
export class ClientHomeComponent implements OnInit {
  protected readonly store = inject(RestaurantStore);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly restaurantRepo = inject(RestaurantRepository);
  private readonly context = inject(RestaurantContextService);
  private readonly auth = inject(AuthService);

  /** Número de mesa que codifica el QR (`/mesa/:numero` o `/r/:slug/mesa/:numero`); 4 por defecto. */
  readonly numero = input(4, { transform: numberAttribute });

  /** true cuando la app no está conectada a Supabase (modo demo en memoria). */
  protected readonly isDemoMode = !isSupabaseConfigured();

  protected readonly screen = signal<ClientScreen>('menu');
  protected readonly activeCat = signal('__all__');
  protected readonly cart = signal<CartLine[]>([]);
  protected readonly myOrderId = signal<number | null>(null);
  protected readonly callSent = signal(false);

  protected readonly mesa = computed(() => (Number.isFinite(this.numero()) ? this.numero() : 4));

  protected readonly catChips = computed(() => ['__all__', ...this.store.categories().map((c) => c.name)]);

  /** El cliente solo ve productos disponibles (lo agotado desaparece del QR). */
  protected readonly visibleProducts = computed(() =>
    this.store
      .products()
        .filter((p) => p.available && (this.activeCat() === '__all__' || p.categoryName === this.activeCat())),
  );

  protected readonly cartCount = computed(() => this.cart().reduce((acc, l) => acc + l.qty, 0));
  protected readonly cartTotal = computed(() =>
    this.cart().reduce((acc, l) => acc + l.qty * l.product.price, 0),
  );

  protected readonly myOrder = computed(() => {
    const id = this.myOrderId();
    return id === null ? null : (this.store.orders().find((o) => o.id === id) ?? null);
  });

  /** Línea de tiempo del estado del pedido, calculada desde el pedido en vivo. */
  protected readonly statusSteps = computed(() => {
    const order = this.myOrder();
    const idx = order ? STEP_DEFS.findIndex((s) => s.key === order.status) : -1;
    return STEP_DEFS.map((step, i) => ({
      ...step,
      done: idx >= i,
      lineDone: idx > i,
    }));
  });

  async ngOnInit(): Promise<void> {
    if (!this.auth.ready()) {
      await this.auth.restoreSession();
    }

    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      const restaurant = await this.restaurantRepo.getBySlug(slug);
      if (restaurant) this.context.set(restaurant.id);
    } else if (!this.context.restaurantId()) {
      const fromAuth = this.auth.restaurantId();
      if (fromAuth) {
        this.context.set(fromAuth);
      } else {
        const restaurant = await this.restaurantRepo.getFirstAvailable();
        if (restaurant) this.context.set(restaurant.id);
      }
    }

    await this.store.init();
  }

  protected qtyOf(productId: number): number {
    return this.cart().find((l) => l.product.id === productId)?.qty ?? 0;
  }

  protected addToCart(product: Product): void {
    this.cart.update((lines) => {
      const existing = lines.find((l) => l.product.id === product.id);
      return existing
        ? lines.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l))
        : [...lines, { product, qty: 1 }];
    });
  }

  protected decFromCart(productId: number): void {
    this.cart.update((lines) =>
      lines.map((l) => (l.product.id === productId ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0),
    );
  }

  /** Envía el pedido a cocina/mesero y pasa a la pantalla de seguimiento. */
  protected async placeOrder(): Promise<void> {
    const items = this.cart().map((l) => ({
      productId: l.product.id,
      productName: l.product.name,
      unitPrice: l.product.price,
      quantity: l.qty,
    }));
    if (!items.length) return;
    const order = await this.store.placeOrder(this.mesa(), items);
    this.cart.set([]);
    this.myOrderId.set(order.id);
    this.screen.set('status');
  }

  /** Avisa al mesero de la mesa; se desactiva tras el primer aviso, como el diseño. */
  protected async callWaiter(): Promise<void> {
    if (this.callSent()) return;
    await this.store.callWaiter(this.mesa());
    this.callSent.set(true);
  }

  protected statusLabel(status: OrderStatus): string {
    return this.translate.instant(`order.status.${status}`);
  }

  protected orderTotalOf(order: { items: Array<{ unitPrice: number; quantity: number }> }): number {
    return order.items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  }
}
