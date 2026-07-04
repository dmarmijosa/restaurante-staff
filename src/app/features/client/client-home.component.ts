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
import { RestaurantStore } from '../../core/application/restaurant.store';
import { RestaurantContextService } from '../../core/application/restaurant-context.service';
import { RestaurantRepository } from '../../core/domain/repositories/repositories';
import { MoneyPipe } from '../../shared/money.pipe';
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
  imports: [MoneyPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col items-center bg-crema">
      <div class="relative flex min-h-dvh w-full max-w-[430px] flex-col bg-marfil shadow-[0_0_40px_rgba(36,26,17,.08)]">
        <!-- Cabecera -->
        <header class="flex-none px-[18px] pt-8 pb-2.5">
          <div class="mb-2.5 flex items-center gap-[9px]">
            @if (store.settings().logoUrl; as logo) {
              <img [src]="logo" alt="Logo del restaurante" class="h-[26px] w-[26px] flex-none rounded-[7px] object-cover" />
            } @else {
              <div
                class="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-terracota font-serif text-[13px] font-bold text-lino-calido"
              >
                {{ store.settings().name.charAt(0) }}
              </div>
            }
            <h1 class="m-0 flex-1 font-serif text-[21px] font-semibold">{{ store.settings().name }}</h1>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-duna px-[11px] py-1 text-[11.5px] font-bold text-terracota-profundo">
              Mesa {{ mesa() }}
            </span>
            <span class="flex-1 text-[10.5px] text-tinta-media">vía código QR</span>
            <button
              type="button"
              (click)="callWaiter()"
              class="cursor-pointer rounded-full border-none px-[13px] py-[7px] text-[11.5px] font-bold"
              [class]="callSent() ? 'bg-oliva-bg text-oliva-texto' : 'bg-cacao text-lino'"
            >
              {{ callSent() ? 'Mesero avisado ✓' : 'Llamar mesero' }}
            </button>
          </div>
        </header>

        <!-- Cerrado por temporada -->
        @if (!store.acceptingOrders()) {
          <div class="flex flex-1 flex-col items-center justify-center gap-3 px-9 text-center">
            <div
              class="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-duna font-serif text-2xl text-terracota-profundo"
            >
              ·
            </div>
            <div class="font-serif text-[26px] leading-tight font-semibold">Cerrado por temporada</div>
            <div class="text-[13.5px] leading-relaxed text-tinta-media">
              Volvemos pronto. ¡Gracias por visitarnos y hasta pronto!
            </div>
          </div>
        } @else {
          @switch (screen()) {
            @case ('menu') {
              <!-- Chips de categorías -->
              <div class="flex flex-none gap-1.5 overflow-x-auto px-[18px] pt-1.5 pb-2.5">
                @for (cat of catChips(); track cat) {
                  <button
                    type="button"
                    (click)="activeCat.set(cat)"
                    class="cursor-pointer rounded-full border-none px-3.5 py-[7px] text-xs font-semibold whitespace-nowrap"
                    [class]="activeCat() === cat ? 'bg-cacao text-lino' : 'bg-arena text-tinta-suave'"
                  >
                    {{ cat }}
                  </button>
                }
              </div>

              @if (myOrder(); as order) {
                <button
                  type="button"
                  (click)="screen.set('status')"
                  class="mx-[18px] mb-2 flex cursor-pointer gap-1.5 rounded-[10px] border-none bg-duna px-[13px] py-[9px] text-left text-xs font-semibold text-terracota-profundo"
                >
                  <span class="flex-1">Pedido #{{ order.id }} · {{ statusLabel(order.status) }} — ver estado</span>
                  <span>→</span>
                </button>
              }

              <!-- Productos -->
              <main class="flex flex-1 flex-col gap-2.5 overflow-y-auto px-[18px] pt-0.5 pb-[130px]">
                @for (product of visibleProducts(); track product.id) {
                  <article class="flex gap-3 rounded-[14px] border border-borde-suave bg-papel p-2.5">
                    @if (product.imageUrl) {
                      <img
                        [src]="product.imageUrl"
                        [alt]="'Foto de ' + product.name"
                        class="h-16 w-16 flex-none rounded-[10px] object-cover"
                      />
                    } @else {
                      <div
                        class="flex h-16 w-16 flex-none items-center justify-center rounded-[10px] bg-panal font-mono text-[9px] text-tinta-media"
                      >
                        foto
                      </div>
                    }
                    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div class="text-[13.5px] font-semibold">{{ product.name }}</div>
                      <div class="text-[11px] leading-snug text-tinta-media">{{ product.description }}</div>
                      <div class="mt-auto text-[13px] font-bold">{{ product.price | money }}</div>
                    </div>
                    <div class="flex flex-col items-center justify-center gap-1">
                      @if (qtyOf(product.id) > 0) {
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            (click)="decFromCart(product.id)"
                            class="h-[26px] w-[26px] cursor-pointer rounded-lg border-[1.5px] border-borde bg-papel text-sm text-tinta"
                            [attr.aria-label]="'Quitar ' + product.name"
                          >
                            −
                          </button>
                          <span class="text-[13px] font-bold">{{ qtyOf(product.id) }}</span>
                          <button
                            type="button"
                            (click)="addToCart(product)"
                            class="h-[26px] w-[26px] cursor-pointer rounded-lg border-none bg-terracota text-sm text-lino-calido"
                            [attr.aria-label]="'Agregar ' + product.name"
                          >
                            +
                          </button>
                        </div>
                      } @else {
                        <button
                          type="button"
                          (click)="addToCart(product)"
                          class="h-8 w-8 cursor-pointer rounded-[10px] border-none bg-terracota text-[17px] text-lino-calido hover:bg-terracota-hover"
                          [attr.aria-label]="'Agregar ' + product.name"
                        >
                          +
                        </button>
                      }
                    </div>
                  </article>
                }
              </main>

              <!-- Barra flotante del carrito -->
              @if (cartCount() > 0) {
                <button
                  type="button"
                  (click)="screen.set('cart')"
                  class="absolute right-[18px] bottom-[70px] left-[18px] flex cursor-pointer items-center gap-2 rounded-[14px] border-none bg-cacao px-[18px] py-[13px] text-lino shadow-[0_12px_28px_rgba(36,26,17,.35)] hover:bg-cacao-claro"
                >
                  <span class="flex-1 text-left text-[13px] font-bold">
                    Ver pedido · {{ cartCount() }} {{ cartCount() === 1 ? 'artículo' : 'artículos' }}
                  </span>
                  <span class="text-[13px] font-bold">{{ cartTotal() | money }}</span>
                  <span class="text-[13px]">→</span>
                </button>
              }
            }

            @case ('cart') {
              <div class="flex min-h-0 flex-1 flex-col px-[18px]">
                <div class="flex items-baseline gap-2.5 pt-1.5 pb-3">
                  <button
                    type="button"
                    (click)="screen.set('menu')"
                    class="cursor-pointer border-none bg-transparent p-0 text-[12.5px] font-semibold text-terracota-profundo"
                  >
                    ← Menú
                  </button>
                  <h2 class="m-0 font-serif text-[19px] font-semibold">Tu pedido</h2>
                </div>
                <div class="flex flex-1 flex-col gap-2.5 overflow-y-auto pb-4">
                  @for (line of cart(); track line.product.id) {
                    <div class="flex items-center gap-2.5 rounded-xl border border-borde-suave bg-papel px-[13px] py-[11px]">
                      <div class="min-w-0 flex-1">
                        <div class="text-[13px] font-semibold">{{ line.product.name }}</div>
                        <div class="text-[11.5px] text-tinta-media">{{ line.product.price | money }} c/u</div>
                      </div>
                      <button
                        type="button"
                        (click)="decFromCart(line.product.id)"
                        class="h-[26px] w-[26px] cursor-pointer rounded-lg border-[1.5px] border-borde bg-papel text-sm text-tinta"
                      >
                        −
                      </button>
                      <span class="min-w-4 text-center text-[13px] font-bold">{{ line.qty }}</span>
                      <button
                        type="button"
                        (click)="addToCart(line.product)"
                        class="h-[26px] w-[26px] cursor-pointer rounded-lg border-none bg-terracota text-sm text-lino-calido"
                      >
                        +
                      </button>
                    </div>
                  }
                </div>
                <div class="flex-none border-t border-borde pt-3.5 pb-6">
                  <div class="mb-3 flex justify-between text-sm">
                    <span class="text-tinta-media">Total</span>
                    <span class="text-base font-bold">{{ cartTotal() | money }}</span>
                  </div>
                  <button
                    type="button"
                    (click)="placeOrder()"
                    [disabled]="cartCount() === 0"
                    class="w-full cursor-pointer rounded-[13px] border-none bg-terracota py-3.5 text-[14.5px] font-bold text-lino-calido hover:bg-terracota-hover disabled:opacity-50"
                  >
                    Enviar pedido a la mesa
                  </button>
                </div>
              </div>
            }

            @case ('status') {
              <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-[22px] pt-1">
                <h2 class="m-0 mb-0.5 font-serif text-[23px] font-semibold">Pedido enviado</h2>
                @if (myOrder(); as order) {
                  <div class="mb-5 text-[12.5px] text-tinta-media">
                    Pedido #{{ order.id }} · Mesa {{ mesa() }} · {{ orderTotalOf(order) | money }}
                  </div>
                  <div class="flex flex-col">
                    @for (step of statusSteps(); track step.key; let last = $last) {
                      <div class="flex gap-3.5">
                        <div class="flex flex-col items-center">
                          <div
                            class="flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold text-lino-calido"
                            [style.background]="step.done ? '#C1683C' : '#F5EDDF'"
                            [style.border-color]="step.done ? '#C1683C' : '#D8CCBC'"
                          >
                            {{ step.done ? '✓' : '' }}
                          </div>
                          @if (!last) {
                            <div class="min-h-[22px] w-0.5 flex-1" [style.background]="step.lineDone ? '#C1683C' : '#E5DACA'"></div>
                          }
                        </div>
                        <div class="pb-5">
                          <div class="text-sm font-bold" [style.color]="step.done ? '#2C2118' : '#A3927F'">
                            {{ step.label }}
                          </div>
                          <div class="mt-0.5 text-[11.5px] text-tinta-media">{{ step.desc }}</div>
                        </div>
                      </div>
                    }
                  </div>
                  <div class="mb-4 flex items-center gap-[11px] rounded-xl border border-borde-suave bg-papel px-3.5 py-3">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-avatar-1 text-[11px] font-bold text-lino-calido"
                    >
                      CM
                    </div>
                    <div class="flex-1">
                      <div class="text-[12.5px] font-semibold">{{ order.waiterName }}</div>
                      <div class="text-[11px] text-tinta-media">Tu mesero esta noche</div>
                    </div>
                  </div>
                }
                <button
                  type="button"
                  (click)="screen.set('menu')"
                  class="mb-6 cursor-pointer rounded-xl border-[1.5px] border-tinta bg-transparent py-[11px] text-[13px] font-bold text-tinta hover:bg-crema"
                >
                  Pedir algo más
                </button>
              </div>
            }
          }
        }

        <!-- Footer con acceso del personal (requisito del producto) -->
        <footer class="mt-auto flex-none border-t border-borde-suave bg-crema px-[18px] py-4">
          <div class="flex items-center gap-2.5">
            <div class="flex-1 text-[10.5px] leading-relaxed text-tinta-media">
              Restaurante Staff · plataforma open source ·
              <span class="font-semibold">{{ store.settings().name }}</span>
            </div>
            <a
              routerLink="/login"
              data-testid="staff-login-link"
              class="rounded-full border-[1.5px] border-borde-punteado px-3.5 py-1.5 text-[11.5px] font-bold text-tinta-suave hover:bg-panal"
            >
              Acceso del personal →
            </a>
          </div>
        </footer>
      </div>
    </div>
  `,
})
export class ClientHomeComponent implements OnInit {
  protected readonly store = inject(RestaurantStore);
  private readonly route = inject(ActivatedRoute);
  private readonly restaurantRepo = inject(RestaurantRepository);
  private readonly context = inject(RestaurantContextService);

  /** Número de mesa que codifica el QR (`/mesa/:numero` o `/r/:slug/mesa/:numero`); 4 por defecto. */
  readonly numero = input(4, { transform: numberAttribute });

  protected readonly screen = signal<ClientScreen>('menu');
  protected readonly activeCat = signal('Todas');
  protected readonly cart = signal<CartLine[]>([]);
  protected readonly myOrderId = signal<number | null>(null);
  protected readonly callSent = signal(false);

  protected readonly mesa = computed(() => (Number.isFinite(this.numero()) ? this.numero() : 4));

  protected readonly catChips = computed(() => ['Todas', ...this.store.categories().map((c) => c.name)]);

  /** El cliente solo ve productos disponibles (lo agotado desaparece del QR). */
  protected readonly visibleProducts = computed(() =>
    this.store
      .products()
      .filter((p) => p.available && (this.activeCat() === 'Todas' || p.categoryName === this.activeCat())),
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
    // En rutas /r/:slug resuelve el slug al restaurant_id antes de cargar datos.
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug && !this.context.restaurantId()) {
      const restaurant = await this.restaurantRepo.getBySlug(slug);
      if (restaurant) this.context.set(restaurant.id);
    }
    void this.store.init();
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
    return { recibido: 'Recibido', preparando: 'En preparación', listo: 'Listo', entregado: 'Entregado' }[status];
  }

  protected orderTotalOf(order: { items: Array<{ unitPrice: number; quantity: number }> }): number {
    return order.items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  }
}
