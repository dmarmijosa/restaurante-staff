/**
 * Store global del restaurante (capa de aplicación).
 *
 * ¿Por qué un store único? El diseño original comparte un mismo estado entre
 * las cuatro vistas (admin, mesero, cocina y cliente): las mesas del plano son
 * las de la tablet del mesero, los pedidos del cliente llegan a cocina, etc.
 * Este servicio orquesta los repositorios y expone signals derivados; los
 * componentes solo leen signals y llaman métodos con intención de negocio.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  Category,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  RestaurantSettings,
  RestaurantTable,
  Season,
  Shift,
  StaffMember,
  TableShape,
  TableStatus,
  WaiterCall,
  WorkSchedule,
} from '../domain/entities/entities';
import { isAcceptingOrders } from '../domain/entities/entities';
import {
  CallsRepository,
  MenuRepository,
  OrdersRepository,
  PaymentsRepository,
  SettingsRepository,
  StaffRepository,
  StorageRepository,
  TablesRepository,
  WorkScheduleRepository,
} from '../domain/repositories/repositories';
import { ToastService } from '../../shared/toast/toast.service';
import { compressImage } from '../../shared/image-utils';

/** Orden natural del flujo de una comanda. */
const ORDER_CHAIN: OrderStatus[] = ['recibido', 'preparando', 'listo', 'entregado'];
const ORDER_LABELS: Record<OrderStatus, string> = {
  recibido: 'Recibido',
  preparando: 'Preparando',
  listo: 'Listo',
  entregado: 'Entregado',
};
const SHIFT_ORDER: Shift[] = ['manana', 'tarde', 'noche'];

@Injectable({ providedIn: 'root' })
export class RestaurantStore {
  private menuRepo = inject(MenuRepository);
  private tablesRepo = inject(TablesRepository);
  private ordersRepo = inject(OrdersRepository);
  private callsRepo = inject(CallsRepository);
  private staffRepo = inject(StaffRepository);
  private settingsRepo = inject(SettingsRepository);
  private storageRepo = inject(StorageRepository);
  private paymentsRepo = inject(PaymentsRepository);
  private scheduleRepo = inject(WorkScheduleRepository);
  private toast = inject(ToastService);

  readonly settings = signal<RestaurantSettings>({
    name: 'Casa Nogal',
    isOpen: true,
    season: 'alta',
    seasonStart: null,
    seasonEnd: null,
    logoUrl: null,
  });
  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly tables = signal<RestaurantTable[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly calls = signal<WaiterCall[]>([]);
  readonly staff = signal<StaffMember[]>([]);
  readonly paymentMethods = signal<PaymentMethod[]>([]);
  readonly schedules = signal<WorkSchedule[]>([]);
  readonly loaded = signal(false);

  /** El menú QR solo acepta pedidos con el restaurante abierto. */
  readonly acceptingOrders = computed(() => isAcceptingOrders(this.settings()));
  readonly activeOrders = computed(() => this.orders().filter((o) => o.status !== 'entregado'));
  readonly pendingCalls = computed(() => this.calls().filter((c) => !c.attended));
  readonly kitchenOrders = computed(() =>
    this.orders().filter((o) => o.status === 'recibido' || o.status === 'preparando'),
  );
  readonly waiters = computed(() => this.staff().filter((s) => s.role === 'mesero'));
  readonly admins = computed(() => this.staff().filter((s) => s.role === 'admin'));
  /** Métodos de pago activos, los que el cajero puede usar para cobrar. */
  readonly activePaymentMethods = computed(() => this.paymentMethods().filter((m) => m.active));
  /** Cobro del cajero: pedidos entregados aún sin pagar. */
  readonly ordersToCharge = computed(() => this.orders().filter((o) => !o.paid));

  private unsubscribers: Array<() => void> = [];

  /**
   * Carga inicial + suscripción a cambios externos (Supabase Realtime o el
   * emisor del modo demo). Idempotente: las vistas pueden llamarla al entrar
   * sin duplicar suscripciones.
   */
  async init(): Promise<void> {
    if (this.loaded()) return;
    await this.refreshAll();
    this.unsubscribers.push(
      this.ordersRepo.onChange(() => void this.refreshOrders()),
      this.callsRepo.onChange(() => void this.refreshCalls()),
    );
    this.loaded.set(true);
  }

  async refreshAll(): Promise<void> {
    // Cada recurso se resuelve de forma independiente: el cliente anónimo no
    // puede leer `profiles` (protección de datos), así que ese fallo no debe
    // vaciar el menú público. `allSettled` aísla cada error.
    const [settings, categories, products, tables, orders, calls, staff, methods, schedules] =
      await Promise.allSettled([
        this.settingsRepo.getSettings(),
        this.menuRepo.getCategories(),
        this.menuRepo.getProducts(),
        this.tablesRepo.getTables(),
        this.ordersRepo.getOrders(),
        this.callsRepo.getPendingCalls(),
        this.staffRepo.getStaff(),
        this.paymentsRepo.getMethods(),
        this.scheduleRepo.getSchedules().catch(() => [] as WorkSchedule[]),
      ]);
    if (settings.status === 'fulfilled') this.settings.set(settings.value);
    if (categories.status === 'fulfilled') this.categories.set(categories.value);
    if (products.status === 'fulfilled') this.products.set(products.value);
    if (tables.status === 'fulfilled') this.tables.set(tables.value);
    if (calls.status === 'fulfilled') this.calls.set(calls.value);
    if (staff.status === 'fulfilled') this.staff.set(staff.value);
    if (methods.status === 'fulfilled') this.paymentMethods.set(methods.value);
    if (schedules.status === 'fulfilled') this.schedules.set(schedules.value);
    if (orders.status === 'fulfilled') this.orders.set(this.withWaiterNames(orders.value));
  }

  /** Guarda (upsert) el horario semanal de un trabajador. */
  async saveSchedule(schedule: WorkSchedule): Promise<void> {
    this.schedules.update((list) => {
      const idx = list.findIndex((s) => s.staffId === schedule.staffId);
      if (idx >= 0) return list.map((s) => (s.staffId === schedule.staffId ? schedule : s));
      return [...list, schedule];
    });
    await this.scheduleRepo.saveSchedule(schedule);
    this.toast.show('Horario guardado');
  }

  private async refreshOrders(): Promise<void> {
    this.orders.set(this.withWaiterNames(await this.ordersRepo.getOrders()));
  }

  /**
   * Rellena `waiterName` desde el listado de personal (cuando la sesión puede
   * leerlo). Para el cliente anónimo, sin acceso a `profiles`, queda en '—'.
   */
  private withWaiterNames(orders: Order[]): Order[] {
    const staff = this.staff();
    if (!staff.length) return orders;
    return orders.map((o) => {
      if (o.waiterName !== '—' || !o.waiterId) return o;
      const name = staff.find((s) => s.id === o.waiterId)?.fullName;
      return name ? { ...o, waiterName: name } : o;
    });
  }

  private async refreshCalls(): Promise<void> {
    this.calls.set(await this.callsRepo.getPendingCalls());
  }

  // ────────────────────────── Plano del salón ──────────────────────────

  /** Mueve una mesa en el plano (drag & drop del admin). */
  async moveTable(id: number, x: number, y: number): Promise<void> {
    this.tables.update((ts) => ts.map((t) => (t.id === id ? { ...t, x, y } : t)));
    const table = this.tables().find((t) => t.id === id);
    if (table) await this.tablesRepo.saveTable(table);
  }

  async addTable(): Promise<void> {
    const ts = this.tables();
    const number = Math.max(0, ...ts.map((t) => (t.mergedNumbers ? Math.max(...t.mergedNumbers) : t.number))) + 1;
    const created = await this.tablesRepo.addTable({
      number,
      x: 30 + ((ts.length * 52) % 500),
      y: 30 + ((ts.length * 36) % 360),
      seats: 4,
      shape: 'sq',
      status: 'libre',
      waiterId: null,
      mergedNumbers: null,
    });
    this.tables.update((list) => [...list, created]);
    this.toast.show('toast.table_added');
  }

  /** Asigna (o quita) el mesero responsable de una mesa. */
  async assignWaiter(tableId: number, waiterId: string | null): Promise<void> {
    this.tables.update((ts) => ts.map((t) => (t.id === tableId ? { ...t, waiterId } : t)));
    const table = this.tables().find((t) => t.id === tableId);
    if (table) await this.tablesRepo.saveTable(table);
  }

  async removeTable(id: number): Promise<void> {
    await this.tablesRepo.deleteTable(id);
    this.tables.update((ts) => ts.filter((t) => t.id !== id));
    this.toast.show('toast.table_deleted');
  }

  async updateTable(id: number, patch: Partial<Pick<RestaurantTable, 'seats' | 'shape' | 'status'>>): Promise<void> {
    this.tables.update((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const table = this.tables().find((t) => t.id === id);
    if (table) await this.tablesRepo.saveTable(table);
  }

  async changeSeats(id: number, delta: number): Promise<void> {
    const t = this.tables().find((x) => x.id === id);
    if (!t) return;
    await this.updateTable(id, { seats: Math.min(12, Math.max(1, t.seats + delta)) });
  }

  async setShape(id: number, shape: TableShape): Promise<void> {
    await this.updateTable(id, { shape });
  }

  async setTableStatus(id: number, status: TableStatus): Promise<void> {
    await this.updateTable(id, { status });
  }

  /**
   * Fusiona dos mesas en una (regla del diseño: conserva copia de las
   * originales para poder separarlas después).
   */
  async mergeTables(aId: number, bId: number): Promise<RestaurantTable | null> {
    const a = this.tables().find((t) => t.id === aId);
    const b = this.tables().find((t) => t.id === bId);
    if (!a || !b) return null;
    const merged: RestaurantTable = {
      ...a,
      seats: a.seats + b.seats,
      shape: 'sq',
      mergedNumbers: [...(a.mergedNumbers ?? [a.number]), ...(b.mergedNumbers ?? [b.number])],
      backup: { a: { ...a }, b: { ...b } },
    };
    this.tables.update((ts) => ts.filter((t) => t.id !== bId).map((t) => (t.id === aId ? merged : t)));
    await this.tablesRepo.deleteTable(bId);
    await this.tablesRepo.saveTable(merged);
    this.toast.show('toast.tables_merged');
    return merged;
  }

  /** Deshace una fusión restaurando las dos mesas originales. */
  async splitTable(id: number): Promise<void> {
    const t = this.tables().find((x) => x.id === id);
    if (!t?.backup) return;
    const a: RestaurantTable = { ...t.backup.a, x: t.x, y: t.y };
    const bDraft = { ...t.backup.b, x: Math.min(t.x + 200, 700), y: Math.min(t.y + 40, 440) };
    this.tables.update((ts) => ts.map((x) => (x.id === id ? a : x)));
    await this.tablesRepo.saveTable(a);
    const { id: _dropped, ...bInput } = bDraft;
    const b = await this.tablesRepo.addTable(bInput);
    this.tables.update((ts) => [...ts, b]);
    this.toast.show('toast.table_split');
  }

  // ────────────────────────── Pedidos ──────────────────────────

  /** Avanza una comanda al siguiente estado del flujo. */
  async advanceOrder(id: number): Promise<void> {
    const order = this.orders().find((o) => o.id === id);
    if (!order) return;
    const idx = ORDER_CHAIN.indexOf(order.status);
    const next = ORDER_CHAIN[Math.min(idx + 1, ORDER_CHAIN.length - 1)];
    this.orders.update((os) =>
      os.map((o) =>
        o.id === id
          ? { ...o, status: next, readyAtMs: next === 'listo' && o.readyAtMs == null ? Date.now() : o.readyAtMs }
          : o,
      ),
    );
    await this.ordersRepo.setStatus(id, next);
    this.toast.show('toast.order_advanced', { id, status: next });
  }

  /** Registra el cobro de un pedido (lo hace el cajero) con el método elegido. */
  async chargeOrder(orderId: number, paymentMethod: string): Promise<void> {
    this.orders.update((os) =>
      os.map((o) => (o.id === orderId ? { ...o, paid: true, paymentMethod, paidAt: 'ahora' } : o)),
    );
    await this.ordersRepo.chargeOrder(orderId, paymentMethod);
    this.toast.show('toast.order_charged', { id: orderId });
  }

  // ────────────────────────── Métodos de pago (admin) ──────────────────────────

  async addPaymentMethod(name: string): Promise<boolean> {
    const clean = name.trim();
    if (!clean) return false;
    if (this.paymentMethods().some((m) => m.name.toLowerCase() === clean.toLowerCase())) {
      this.toast.show('toast.payment_name_required');
      return false;
    }
    const created = await this.paymentsRepo.addMethod(clean);
    this.paymentMethods.update((ms) => [...ms, created]);
    this.toast.show('toast.payment_added');
    return true;
  }

  async togglePaymentMethod(id: number): Promise<void> {
    const method = this.paymentMethods().find((m) => m.id === id);
    if (!method) return;
    const active = !method.active;
    this.paymentMethods.update((ms) => ms.map((m) => (m.id === id ? { ...m, active } : m)));
    await this.paymentsRepo.setActive(id, active);
  }

  async deletePaymentMethod(id: number): Promise<void> {
    await this.paymentsRepo.deleteMethod(id);
    this.paymentMethods.update((ms) => ms.filter((m) => m.id !== id));
    this.toast.show('toast.payment_added');
  }

  /** Crea el pedido del cliente QR y lo marca como "mío" para su seguimiento. */
  async placeOrder(tableNumber: number, items: OrderItem[]): Promise<Order> {
    const order = await this.ordersRepo.placeOrder(tableNumber, items);
    this.orders.update((os) => [{ ...order, mine: true }, ...os.filter((o) => o.id !== order.id)]);
    this.toast.show('toast.order_placed');
    return order;
  }

  // ────────────────────────── Llamadas al mesero ──────────────────────────

  async callWaiter(tableNumber: number): Promise<void> {
    const call = await this.callsRepo.createCall(tableNumber);
    this.calls.update((cs) => [...cs, call]);
    this.toast.show('toast.waiter_called');
  }

  async attendCall(id: number): Promise<void> {
    await this.callsRepo.attendCall(id);
    this.calls.update((cs) => cs.map((c) => (c.id === id ? { ...c, attended: true } : c)));
    this.toast.show('toast.call_attended');
  }

  // ────────────────────────── Menú ──────────────────────────

  async toggleProductAvailability(id: number): Promise<void> {
    const product = this.products().find((p) => p.id === id);
    if (!product) return;
    const available = !product.available;
    this.products.update((ps) => ps.map((p) => (p.id === id ? { ...p, available } : p)));
    await this.menuRepo.setProductAvailability(id, available);
    this.toast.show(
      available ? 'toast.product_available' : 'toast.product_sold_out',
      { name: product.name },
    );
  }

  async addProduct(input: { name: string; price: number; categoryId: number | null }): Promise<void> {
    const created = await this.menuRepo.addProduct(input);
    this.products.update((ps) => [...ps, created]);
    this.toast.show('toast.product_added');
  }

  /**
   * Sube una foto a Storage y la asocia al producto. El menú del cliente la
   * muestra al instante (actualización optimista del signal).
   */
  async setProductImageFromFile(id: number, file: File): Promise<void> {
    try {
      const url = await this.storageRepo.uploadImage(await compressImage(file), 'productos');
      await this.menuRepo.setProductImage(id, url);
      this.products.update((ps) => ps.map((p) => (p.id === id ? { ...p, imageUrl: url } : p)));
      this.toast.show('toast.product_image_updated');
    } catch {
      this.toast.show('toast.product_image_error');
    }
  }

  async addCategory(name: string): Promise<boolean> {
    if (this.categories().some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      this.toast.show('toast.category_exists');
      return false;
    }
    const created = await this.menuRepo.addCategory(name);
    this.categories.update((cs) => [...cs, created]);
    this.toast.show('toast.category_added');
    return true;
  }

  /** Regla del diseño: no se borra una categoría con productos dentro. */
  async deleteCategory(id: number): Promise<void> {
    const hasProducts = this.products().some((p) => p.categoryId === id);
    if (hasProducts) {
      this.toast.show('toast.category_has_products');
      return;
    }
    await this.menuRepo.deleteCategory(id);
    this.categories.update((cs) => cs.filter((c) => c.id !== id));
    this.toast.show('toast.category_deleted');
  }

  // ────────────────────────── Personal ──────────────────────────

  async addWaiter(fullName: string, shift: Shift): Promise<void> {
    await this.addTeamMember(fullName, 'mesero', shift);
  }

  /**
   * Alta de personal operativo (mesero, cocina o cajero) con turno. Los tres se
   * gestionan igual desde "Meseros y turnos".
   */
  async addTeamMember(fullName: string, role: 'mesero' | 'cocina' | 'cajero', shift: Shift): Promise<void> {
    const created = await this.staffRepo.addStaff({ fullName, email: '', role, shift });
    this.staff.update((ss) => [...ss, created]);
    const key = role === 'mesero' ? 'toast.staff_waiter_added' : role === 'cocina' ? 'toast.staff_cook_added' : 'toast.staff_cashier_added';
    this.toast.show(key);
  }

  async addAdmin(fullName: string, email: string): Promise<void> {
    const created = await this.staffRepo.addStaff({ fullName, email, role: 'admin' });
    this.staff.update((ss) => [...ss, created]);
    this.toast.show('toast.staff_admin_added');
  }

  async rotateShift(id: string): Promise<void> {
    const member = this.staff().find((s) => s.id === id);
    if (!member?.shift) return;
    const next = SHIFT_ORDER[(SHIFT_ORDER.indexOf(member.shift) + 1) % SHIFT_ORDER.length];
    this.staff.update((ss) => ss.map((s) => (s.id === id ? { ...s, shift: next } : s)));
    await this.staffRepo.updateStaff(id, { shift: next });
    this.toast.show('toast.shift_rotated', { name: member.fullName.split(' ')[0], shift: next });
  }

  async toggleVacation(id: string): Promise<void> {
    const member = this.staff().find((s) => s.id === id);
    if (!member) return;
    const status = member.status === 'activo' ? 'vacaciones' : 'activo';
    this.staff.update((ss) => ss.map((s) => (s.id === id ? { ...s, status } : s)));
    await this.staffRepo.updateStaff(id, { status });
  }

  async setRole(id: string, role: StaffMember['role']): Promise<void> {
    this.staff.update((ss) => ss.map((s) => (s.id === id ? { ...s, role } : s)));
    await this.staffRepo.updateStaff(id, { role });
    this.toast.show('toast.role_updated');
  }

  /**
   * Eliminación PERMANENTE de un miembro del personal (derecho de supresión,
   * protección de datos). La cuenta propietaria está protegida por regla de
   * dominio y por RLS.
   */
  async deleteStaffPermanently(id: string): Promise<void> {
    const member = this.staff().find((s) => s.id === id);
    if (!member) return;
    if (member.isOwner) {
      this.toast.show('toast.owner_protected');
      return;
    }
    await this.staffRepo.deleteStaffPermanently(id);
    this.staff.update((ss) => ss.filter((s) => s.id !== id));
    this.toast.show('toast.staff_deleted', { name: member.fullName });
  }

  // ────────────────────────── Ajustes ──────────────────────────

  async toggleOpen(): Promise<void> {
    const isOpen = !this.settings().isOpen;
    this.settings.update((s) => ({ ...s, isOpen }));
    await this.settingsRepo.updateSettings({ isOpen });
    this.toast.show(isOpen ? 'toast.restaurant_open' : 'toast.restaurant_closed');
  }

  async setSeason(season: Season): Promise<void> {
    this.settings.update((s) => ({ ...s, season }));
    await this.settingsRepo.updateSettings({ season });
  }

  /** Actualiza inicio y/o fin de temporada (formato ISO yyyy-mm-dd o null). */
  async setSeasonDates(patch: { seasonStart?: string | null; seasonEnd?: string | null }): Promise<void> {
    this.settings.update((s) => ({ ...s, ...patch }));
    await this.settingsRepo.updateSettings(patch);
  }

  async setRestaurantName(name: string): Promise<void> {
    this.settings.update((s) => ({ ...s, name }));
    await this.settingsRepo.updateSettings({ name });
  }

  /** Sube el logo a Storage y lo propaga a todo el sistema. */
  async setLogoFromFile(file: File): Promise<void> {
    try {
      // El logo se muestra pequeño: basta con 512px de lado mayor.
      const url = await this.storageRepo.uploadImage(await compressImage(file, 512), 'logo');
      this.settings.update((s) => ({ ...s, logoUrl: url }));
      await this.settingsRepo.updateSettings({ logoUrl: url });
      this.toast.show('toast.logo_updated');
    } catch {
      this.toast.show('toast.logo_error');
    }
  }
}
