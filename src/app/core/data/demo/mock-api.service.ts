/**
 * Mock API — backend simulado en memoria para el modo demo (open source).
 *
 * ¿Por qué? El proyecto debe poder probarse sin Supabase. En vez de tener el
 * estado disperso por cada repositorio, este servicio actúa como **una sola API
 * en memoria** que sirve a todos los roles (admin, mesero, cocina, cajero y
 * cliente). Simula latencia de red para que la experiencia se parezca a un
 * backend real, y notifica cambios (imita Realtime dentro de la pestaña).
 *
 * Los repositorios demo son adaptadores finos sobre esta API.
 */
import { Injectable } from '@angular/core';
import type {
  Category,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  RestaurantSettings,
  RestaurantTable,
  Shift,
  StaffMember,
  StaffRole,
  WaiterCall,
  WorkSchedule,
} from '../../domain/entities/entities';
import type { SessionUser } from '../../domain/repositories/repositories';
import {
  DEMO_CALLS,
  DEMO_CATEGORIES,
  DEMO_ORDERS,
  DEMO_PAYMENT_METHODS,
  DEMO_PRODUCTS,
  DEMO_RESTAURANT_ID,
  DEMO_SETTINGS,
  DEMO_SCHEDULES,
  DEMO_STAFF,
  DEMO_TABLES,
  DEMO_USERS,
} from './demo-data';

const clone = <T>(value: T): T => structuredClone(value);

/** Emisor mínimo para imitar Realtime dentro de la misma pestaña. */
class Emitter {
  private listeners = new Set<() => void>();
  on(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(): void {
    this.listeners.forEach((l) => l());
  }
}

@Injectable({ providedIn: 'root' })
export class MockApiService {
  // ── "Base de datos" en memoria ──
  private categories = clone(DEMO_CATEGORIES);
  private products = clone(DEMO_PRODUCTS);
  private tables = clone(DEMO_TABLES);
  private orders = clone(DEMO_ORDERS);
  private calls = clone(DEMO_CALLS);
  private staff = clone(DEMO_STAFF);
  private settings = clone(DEMO_SETTINGS);
  private methods = clone(DEMO_PAYMENT_METHODS);
  private schedules = clone(DEMO_SCHEDULES);
  private current: SessionUser | null = null;

  readonly orders$ = new Emitter();
  readonly calls$ = new Emitter();

  /** Simula la latencia de red y devuelve el valor (clonado). */
  private async respond<T>(value: T): Promise<T> {
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 60));
    return clone(value);
  }

  // ── Menú ──
  getCategories() {
    return this.respond(this.categories);
  }
  async addCategory(name: string): Promise<Category> {
    const cat: Category = { id: Math.max(0, ...this.categories.map((c) => c.id)) + 1, name, position: this.categories.length + 1 };
    this.categories.push(cat);
    return this.respond(cat);
  }
  async deleteCategory(id: number): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id);
    await this.respond(null);
  }
  getProducts() {
    return this.respond(this.products);
  }
  async addProduct(input: { name: string; price: number; categoryId: number | null; description?: string }): Promise<Product> {
    const product: Product = {
      id: Math.max(0, ...this.products.map((p) => p.id)) + 1,
      name: input.name,
      description: input.description ?? 'Nuevo platillo de la casa.',
      price: input.price,
      categoryId: input.categoryId,
      categoryName: this.categories.find((c) => c.id === input.categoryId)?.name ?? '',
      available: true,
      imageUrl: null,
    };
    this.products.push(product);
    return this.respond(product);
  }
  async setProductAvailability(id: number, available: boolean): Promise<void> {
    const p = this.products.find((x) => x.id === id);
    if (p) p.available = available;
    await this.respond(null);
  }
  async setProductImage(id: number, imageUrl: string | null): Promise<void> {
    const p = this.products.find((x) => x.id === id);
    if (p) p.imageUrl = imageUrl;
    await this.respond(null);
  }

  // ── Mesas ──
  getTables() {
    return this.respond(this.tables);
  }
  async saveTable(table: RestaurantTable): Promise<RestaurantTable> {
    this.tables = this.tables.map((t) => (t.id === table.id ? clone(table) : t));
    return this.respond(table);
  }
  async addTable(table: Omit<RestaurantTable, 'id'>): Promise<RestaurantTable> {
    const created = { ...clone(table), id: Math.max(0, ...this.tables.map((t) => t.id)) + 1 } as RestaurantTable;
    this.tables.push(created);
    return this.respond(created);
  }
  async deleteTable(id: number): Promise<void> {
    this.tables = this.tables.filter((t) => t.id !== id);
    await this.respond(null);
  }

  // ── Pedidos ──
  getOrders() {
    return this.respond(this.orders);
  }
  async placeOrder(tableNumber: number, items: OrderItem[]): Promise<Order> {
    const order: Order = {
      id: Math.max(1040, ...this.orders.map((o) => o.id)) + 1,
      tableNumber,
      waiterName: 'Carlos M.',
      status: 'recibido',
      createdAt: 'ahora',
      createdAtMs: Date.now(),
      readyAtMs: null,
      paid: false,
      paymentMethod: null,
      paidAt: null,
      items: clone(items),
    };
    this.orders.unshift(order);
    this.orders$.emit();
    return this.respond(order);
  }
  async setOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
    const o = this.orders.find((x) => x.id === orderId);
    if (o) {
      o.status = status;
      if (status === 'listo' && o.readyAtMs == null) o.readyAtMs = Date.now();
    }
    this.orders$.emit();
    await this.respond(null);
  }
  async chargeOrder(orderId: number, paymentMethod: string): Promise<void> {
    const o = this.orders.find((x) => x.id === orderId);
    if (o) {
      o.paid = true;
      o.paymentMethod = paymentMethod;
      o.paidAt = 'ahora';
    }
    this.orders$.emit();
    await this.respond(null);
  }

  // ── Llamadas ──
  getPendingCalls() {
    return this.respond(this.calls.filter((c) => !c.attended));
  }
  async createCall(tableNumber: number): Promise<WaiterCall> {
    const call: WaiterCall = { id: Math.max(0, ...this.calls.map((c) => c.id)) + 1, tableNumber, attended: false, createdAt: 'ahora' };
    this.calls.push(call);
    this.calls$.emit();
    return this.respond(call);
  }
  async attendCall(id: number): Promise<void> {
    const c = this.calls.find((x) => x.id === id);
    if (c) c.attended = true;
    this.calls$.emit();
    await this.respond(null);
  }

  // ── Personal ──
  getStaff() {
    return this.respond(this.staff);
  }
  async addStaff(input: { fullName: string; email: string; role: StaffRole; shift?: Shift }): Promise<StaffMember> {
    const member: StaffMember = {
      id: 'u' + Date.now(),
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      shift: input.shift ?? null,
      status: 'activo',
      isOwner: false,
      tables: [],
    };
    this.staff.push(member);
    return this.respond(member);
  }
  async updateStaff(id: string, patch: Partial<Pick<StaffMember, 'role' | 'shift' | 'status'>>): Promise<void> {
    this.staff = this.staff.map((s) => (s.id === id ? { ...s, ...patch } : s));
    await this.respond(null);
  }
  async deleteStaff(id: string): Promise<void> {
    const member = this.staff.find((s) => s.id === id);
    if (member?.isOwner) throw new Error('La cuenta propietaria no puede eliminarse');
    this.staff = this.staff.filter((s) => s.id !== id);
    await this.respond(null);
  }

  // ── Horarios de trabajo ──
  getSchedules() {
    return this.respond(this.schedules);
  }
  async saveSchedule(schedule: WorkSchedule): Promise<void> {
    const idx = this.schedules.findIndex((s) => s.staffId === schedule.staffId);
    if (idx >= 0) this.schedules[idx] = clone(schedule);
    else this.schedules.push(clone(schedule));
    await this.respond(null);
  }

  // ── Ajustes ──
  getSettings() {
    return this.respond(this.settings);
  }
  async updateSettings(patch: Partial<RestaurantSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    await this.respond(null);
  }

  // ── Métodos de pago ──
  getMethods() {
    return this.respond(this.methods);
  }
  async addMethod(name: string): Promise<PaymentMethod> {
    const method: PaymentMethod = { id: Math.max(0, ...this.methods.map((m) => m.id)) + 1, name, active: true, position: this.methods.length + 1 };
    this.methods.push(method);
    return this.respond(method);
  }
  async setMethodActive(id: number, active: boolean): Promise<void> {
    const m = this.methods.find((x) => x.id === id);
    if (m) m.active = active;
    await this.respond(null);
  }
  async deleteMethod(id: number): Promise<void> {
    this.methods = this.methods.filter((m) => m.id !== id);
    await this.respond(null);
  }

  // ── Auth ──
  async signIn(email: string, password: string): Promise<SessionUser> {
    await new Promise((r) => setTimeout(r, 40));
    const match = DEMO_USERS.find((u) => u.email === email && u.password === password);
    if (!match) throw new Error('Credenciales incorrectas');
    const staff = this.staff.find((s) => s.id === match.staffId)!;
    this.current = { id: staff.id, email: staff.email, fullName: staff.fullName, role: staff.role, restaurantId: DEMO_RESTAURANT_ID };
    sessionStorage.setItem('demo-session', JSON.stringify(this.current));
    return clone(this.current);
  }
  signOut(): void {
    this.current = null;
    sessionStorage.removeItem('demo-session');
  }
  getCurrentUser(): SessionUser | null {
    if (this.current) return clone(this.current);
    const raw = sessionStorage.getItem('demo-session');
    this.current = raw ? (JSON.parse(raw) as SessionUser) : null;
    return this.current ? clone(this.current) : null;
  }
}
