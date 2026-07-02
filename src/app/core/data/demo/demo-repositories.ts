/**
 * Implementación en memoria de todos los repositorios.
 *
 * ¿Por qué existe? Dos razones:
 *  1. Modo demo: la app open source debe poder probarse sin una cuenta de
 *     Supabase (npm start y listo), replicando el comportamiento del diseño.
 *  2. Pruebas: las unit tests usan estos repositorios reales-pero-en-memoria
 *     en lugar de mocks frágiles.
 */
import { Injectable } from '@angular/core';
import type {
  Category,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  RestaurantSettings,
  RestaurantTable,
  Shift,
  StaffMember,
  StaffRole,
  WaiterCall,
} from '../../domain/entities/entities';
import {
  AuthRepository,
  CallsRepository,
  MenuRepository,
  OrdersRepository,
  SettingsRepository,
  StaffRepository,
  StorageRepository,
  TablesRepository,
  type SessionUser,
} from '../../domain/repositories/repositories';
import {
  DEMO_CALLS,
  DEMO_CATEGORIES,
  DEMO_ORDERS,
  DEMO_PRODUCTS,
  DEMO_SETTINGS,
  DEMO_STAFF,
  DEMO_TABLES,
  DEMO_USERS,
} from './demo-data';

/** Pequeño emisor para imitar Realtime dentro de la misma pestaña. */
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

const clone = <T>(value: T): T => structuredClone(value);

@Injectable()
export class DemoMenuRepository extends MenuRepository {
  private categories = clone(DEMO_CATEGORIES);
  private products = clone(DEMO_PRODUCTS);

  async getCategories(): Promise<Category[]> {
    return clone(this.categories);
  }

  async addCategory(name: string): Promise<Category> {
    const cat: Category = {
      id: Math.max(0, ...this.categories.map((c) => c.id)) + 1,
      name,
      position: this.categories.length + 1,
    };
    this.categories.push(cat);
    return clone(cat);
  }

  async deleteCategory(id: number): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id);
  }

  async getProducts(): Promise<Product[]> {
    return clone(this.products);
  }

  async addProduct(input: {
    name: string;
    price: number;
    categoryId: number | null;
    description?: string;
  }): Promise<Product> {
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
    return clone(product);
  }

  async setProductAvailability(id: number, available: boolean): Promise<void> {
    const p = this.products.find((x) => x.id === id);
    if (p) p.available = available;
  }

  async setProductImage(id: number, imageUrl: string | null): Promise<void> {
    const p = this.products.find((x) => x.id === id);
    if (p) p.imageUrl = imageUrl;
  }
}

@Injectable()
export class DemoTablesRepository extends TablesRepository {
  private tables = clone(DEMO_TABLES);

  async getTables(): Promise<RestaurantTable[]> {
    return clone(this.tables);
  }

  async saveTable(table: RestaurantTable): Promise<RestaurantTable> {
    this.tables = this.tables.map((t) => (t.id === table.id ? clone(table) : t));
    return clone(table);
  }

  async addTable(table: Omit<RestaurantTable, 'id'>): Promise<RestaurantTable> {
    const created: RestaurantTable = { ...clone(table), id: Math.max(0, ...this.tables.map((t) => t.id)) + 1 } as RestaurantTable;
    this.tables.push(created);
    return clone(created);
  }

  async deleteTable(id: number): Promise<void> {
    this.tables = this.tables.filter((t) => t.id !== id);
  }
}

@Injectable()
export class DemoOrdersRepository extends OrdersRepository {
  private orders = clone(DEMO_ORDERS);
  private emitter = new Emitter();

  async getOrders(): Promise<Order[]> {
    return clone(this.orders);
  }

  async placeOrder(tableNumber: number, items: OrderItem[]): Promise<Order> {
    const order: Order = {
      id: Math.max(1040, ...this.orders.map((o) => o.id)) + 1,
      tableNumber,
      waiterName: 'Carlos M.',
      status: 'recibido',
      createdAt: 'ahora',
      items: clone(items),
    };
    this.orders.unshift(order);
    this.emitter.emit();
    return clone(order);
  }

  async setStatus(orderId: number, status: OrderStatus): Promise<void> {
    const o = this.orders.find((x) => x.id === orderId);
    if (o) o.status = status;
    this.emitter.emit();
  }

  onChange(listener: () => void): () => void {
    return this.emitter.on(listener);
  }
}

@Injectable()
export class DemoCallsRepository extends CallsRepository {
  private calls = clone(DEMO_CALLS);
  private emitter = new Emitter();

  async getPendingCalls(): Promise<WaiterCall[]> {
    return clone(this.calls.filter((c) => !c.attended));
  }

  async createCall(tableNumber: number): Promise<WaiterCall> {
    const call: WaiterCall = {
      id: Math.max(0, ...this.calls.map((c) => c.id)) + 1,
      tableNumber,
      attended: false,
      createdAt: 'ahora',
    };
    this.calls.push(call);
    this.emitter.emit();
    return clone(call);
  }

  async attendCall(id: number): Promise<void> {
    const c = this.calls.find((x) => x.id === id);
    if (c) c.attended = true;
    this.emitter.emit();
  }

  onChange(listener: () => void): () => void {
    return this.emitter.on(listener);
  }
}

@Injectable()
export class DemoStaffRepository extends StaffRepository {
  private staff = clone(DEMO_STAFF);

  async getStaff(): Promise<StaffMember[]> {
    return clone(this.staff);
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
    return clone(member);
  }

  async updateStaff(id: string, patch: Partial<Pick<StaffMember, 'role' | 'shift' | 'status'>>): Promise<void> {
    this.staff = this.staff.map((s) => (s.id === id ? { ...s, ...patch } : s));
  }

  async deleteStaffPermanently(id: string): Promise<void> {
    const member = this.staff.find((s) => s.id === id);
    if (member?.isOwner) {
      throw new Error('La cuenta propietaria no puede eliminarse');
    }
    this.staff = this.staff.filter((s) => s.id !== id);
  }
}

@Injectable()
export class DemoSettingsRepository extends SettingsRepository {
  private settings = clone(DEMO_SETTINGS);

  async getSettings(): Promise<RestaurantSettings> {
    return clone(this.settings);
  }

  async updateSettings(patch: Partial<RestaurantSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
  }
}

@Injectable()
export class DemoAuthRepository extends AuthRepository {
  private current: SessionUser | null = null;

  async signIn(email: string, password: string): Promise<SessionUser> {
    const match = DEMO_USERS.find((u) => u.email === email && u.password === password);
    if (!match) throw new Error('Credenciales incorrectas');
    const staff = DEMO_STAFF.find((s) => s.id === match.staffId)!;
    this.current = { id: staff.id, email: staff.email, fullName: staff.fullName, role: staff.role };
    sessionStorage.setItem('demo-session', JSON.stringify(this.current));
    return this.current;
  }

  async signOut(): Promise<void> {
    this.current = null;
    sessionStorage.removeItem('demo-session');
  }

  async getCurrentUser(): Promise<SessionUser | null> {
    if (this.current) return this.current;
    const raw = sessionStorage.getItem('demo-session');
    this.current = raw ? (JSON.parse(raw) as SessionUser) : null;
    return this.current;
  }

  /** En demo siempre hay un admin de ejemplo, así que el registro inicial no aplica. */
  async adminExists(): Promise<boolean> {
    return true;
  }

  async signUpFirstAdmin(): Promise<SessionUser | null> {
    throw new Error('El registro inicial no está disponible en modo demo');
  }
}

@Injectable()
export class DemoStorageRepository extends StorageRepository {
  /** Devuelve un data URL local para previsualizar sin backend. */
  async uploadImage(file: File, _folder: 'productos' | 'logo'): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
