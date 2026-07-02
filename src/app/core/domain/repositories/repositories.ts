/**
 * Contratos de acceso a datos (puertos de la clean architecture).
 *
 * ¿Por qué clases abstractas y no interfaces? Angular necesita un token de
 * inyección en tiempo de ejecución; una clase abstracta cumple ambos papeles:
 * contrato de tipos y token DI. Así la capa de presentación depende solo del
 * dominio y podemos intercambiar la implementación (Supabase o demo en
 * memoria) sin tocar ningún componente.
 */
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
} from '../entities/entities';

export abstract class MenuRepository {
  abstract getCategories(): Promise<Category[]>;
  abstract addCategory(name: string): Promise<Category>;
  abstract deleteCategory(id: number): Promise<void>;
  abstract getProducts(): Promise<Product[]>;
  abstract addProduct(input: {
    name: string;
    price: number;
    categoryId: number | null;
    description?: string;
  }): Promise<Product>;
  abstract setProductAvailability(id: number, available: boolean): Promise<void>;
}

export abstract class TablesRepository {
  abstract getTables(): Promise<RestaurantTable[]>;
  abstract saveTable(table: RestaurantTable): Promise<RestaurantTable>;
  abstract addTable(table: Omit<RestaurantTable, 'id'>): Promise<RestaurantTable>;
  abstract deleteTable(id: number): Promise<void>;
}

export abstract class OrdersRepository {
  abstract getOrders(): Promise<Order[]>;
  abstract placeOrder(tableNumber: number, items: OrderItem[]): Promise<Order>;
  abstract setStatus(orderId: number, status: OrderStatus): Promise<void>;
  /** Notifica cambios externos (Realtime). El demo lo resuelve en memoria. */
  abstract onChange(listener: () => void): () => void;
}

export abstract class CallsRepository {
  abstract getPendingCalls(): Promise<WaiterCall[]>;
  abstract createCall(tableNumber: number): Promise<WaiterCall>;
  abstract attendCall(id: number): Promise<void>;
  abstract onChange(listener: () => void): () => void;
}

export abstract class StaffRepository {
  abstract getStaff(): Promise<StaffMember[]>;
  abstract addStaff(input: { fullName: string; email: string; role: StaffRole; shift?: Shift }): Promise<StaffMember>;
  abstract updateStaff(id: string, patch: Partial<Pick<StaffMember, 'role' | 'shift' | 'status'>>): Promise<void>;
  /**
   * Eliminación PERMANENTE del perfil (derecho de supresión / protección de
   * datos). Solo el admin puede invocarla y la RLS bloquea a la cuenta
   * propietaria.
   */
  abstract deleteStaffPermanently(id: string): Promise<void>;
}

export abstract class SettingsRepository {
  abstract getSettings(): Promise<RestaurantSettings>;
  abstract updateSettings(patch: Partial<RestaurantSettings>): Promise<void>;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
}

export abstract class AuthRepository {
  abstract signIn(email: string, password: string): Promise<SessionUser>;
  abstract signOut(): Promise<void>;
  abstract getCurrentUser(): Promise<SessionUser | null>;
}
