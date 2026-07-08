/**
 * Repositorios demo — adaptadores finos sobre la Mock API en memoria.
 *
 * Toda la lógica y el estado viven en `MockApiService` (un único backend
 * simulado). Cada repositorio traduce el contrato de dominio a llamadas de esa
 * API, igual que los repositorios de Supabase traducen a llamadas HTTP.
 */
import { Injectable, inject } from '@angular/core';
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
import {
  AuthRepository,
  CallsRepository,
  MenuRepository,
  OrdersRepository,
  PaymentsRepository,
  RestaurantRepository,
  SettingsRepository,
  StaffRepository,
  StorageRepository,
  TablesRepository,
  WorkScheduleRepository,
  type SessionUser,
} from '../../domain/repositories/repositories';
import { DEMO_RESTAURANT_ID } from './demo-data';
import { MockApiService } from './mock-api.service';

@Injectable()
export class DemoMenuRepository extends MenuRepository {
  private api = inject(MockApiService);
  getCategories(): Promise<Category[]> {
    return this.api.getCategories();
  }
  addCategory(name: string): Promise<Category> {
    return this.api.addCategory(name);
  }
  deleteCategory(id: number): Promise<void> {
    return this.api.deleteCategory(id);
  }
  getProducts(): Promise<Product[]> {
    return this.api.getProducts();
  }
  addProduct(input: { name: string; price: number; categoryId: number | null; description?: string }): Promise<Product> {
    return this.api.addProduct(input);
  }
  setProductAvailability(id: number, available: boolean): Promise<void> {
    return this.api.setProductAvailability(id, available);
  }
  setProductImage(id: number, imageUrl: string | null): Promise<void> {
    return this.api.setProductImage(id, imageUrl);
  }
}

@Injectable()
export class DemoTablesRepository extends TablesRepository {
  private api = inject(MockApiService);
  getTables(): Promise<RestaurantTable[]> {
    return this.api.getTables();
  }
  saveTable(table: RestaurantTable): Promise<RestaurantTable> {
    return this.api.saveTable(table);
  }
  addTable(table: Omit<RestaurantTable, 'id'>): Promise<RestaurantTable> {
    return this.api.addTable(table);
  }
  deleteTable(id: number): Promise<void> {
    return this.api.deleteTable(id);
  }
}

@Injectable()
export class DemoOrdersRepository extends OrdersRepository {
  private api = inject(MockApiService);
  getOrders(): Promise<Order[]> {
    return this.api.getOrders();
  }
  placeOrder(tableNumber: number, items: OrderItem[]): Promise<Order> {
    return this.api.placeOrder(tableNumber, items);
  }
  setStatus(orderId: number, status: OrderStatus): Promise<void> {
    return this.api.setOrderStatus(orderId, status);
  }
  chargeOrder(orderId: number, paymentMethod: string): Promise<void> {
    return this.api.chargeOrder(orderId, paymentMethod);
  }
  onChange(listener: () => void): () => void {
    return this.api.orders$.on(listener);
  }
}

@Injectable()
export class DemoCallsRepository extends CallsRepository {
  private api = inject(MockApiService);
  getPendingCalls(): Promise<WaiterCall[]> {
    return this.api.getPendingCalls();
  }
  createCall(tableNumber: number): Promise<WaiterCall> {
    return this.api.createCall(tableNumber);
  }
  attendCall(id: number): Promise<void> {
    return this.api.attendCall(id);
  }
  onChange(listener: () => void): () => void {
    return this.api.calls$.on(listener);
  }
}

@Injectable()
export class DemoStaffRepository extends StaffRepository {
  private api = inject(MockApiService);
  getStaff(): Promise<StaffMember[]> {
    return this.api.getStaff();
  }
  addStaff(input: { fullName: string; email: string; role: StaffRole; shift?: Shift }): Promise<StaffMember> {
    return this.api.addStaff(input);
  }
  updateStaff(id: string, patch: Partial<Pick<StaffMember, 'role' | 'shift' | 'status'>>): Promise<void> {
    return this.api.updateStaff(id, patch);
  }
  deleteStaffPermanently(id: string): Promise<void> {
    return this.api.deleteStaff(id);
  }
}

@Injectable()
export class DemoWorkScheduleRepository extends WorkScheduleRepository {
  private api = inject(MockApiService);
  getSchedules(): Promise<WorkSchedule[]> {
    return this.api.getSchedules();
  }
  saveSchedule(schedule: WorkSchedule): Promise<void> {
    return this.api.saveSchedule(schedule);
  }
}

@Injectable()
export class DemoSettingsRepository extends SettingsRepository {
  private api = inject(MockApiService);
  getSettings(): Promise<RestaurantSettings> {
    return this.api.getSettings();
  }
  updateSettings(patch: Partial<RestaurantSettings>): Promise<void> {
    return this.api.updateSettings(patch);
  }
}

@Injectable()
export class DemoAuthRepository extends AuthRepository {
  private api = inject(MockApiService);
  signIn(email: string, password: string): Promise<SessionUser> {
    return this.api.signIn(email, password);
  }
  async signOut(): Promise<void> {
    this.api.signOut();
  }
  async getCurrentUser(): Promise<SessionUser | null> {
    return this.api.getCurrentUser();
  }
  /** En demo siempre hay un admin de ejemplo, así que el registro inicial no aplica. */
  async adminExists(_restaurantId?: string): Promise<boolean> {
    return true;
  }
  async signUpFirstAdmin(): Promise<SessionUser | null> {
    throw new Error('El registro inicial no está disponible en modo demo');
  }
}

@Injectable()
export class DemoRestaurantRepository extends RestaurantRepository {
  async create(_name: string, _slug: string): Promise<string> {
    return DEMO_RESTAURANT_ID;
  }
  async getBySlug(_slug: string): Promise<{ id: string; name: string; slug: string }> {
    return { id: DEMO_RESTAURANT_ID, name: 'Casa Nogal (demo)', slug: 'demo' };
  }
  async getFirstAvailable(): Promise<{ id: string; name: string; slug: string }> {
    return { id: DEMO_RESTAURANT_ID, name: 'Casa Nogal (demo)', slug: 'demo' };
  }
}

@Injectable()
export class DemoPaymentsRepository extends PaymentsRepository {
  private api = inject(MockApiService);
  getMethods(): Promise<PaymentMethod[]> {
    return this.api.getMethods();
  }
  addMethod(name: string): Promise<PaymentMethod> {
    return this.api.addMethod(name);
  }
  setActive(id: number, active: boolean): Promise<void> {
    return this.api.setMethodActive(id, active);
  }
  deleteMethod(id: number): Promise<void> {
    return this.api.deleteMethod(id);
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
