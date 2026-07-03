/**
 * Entidades del dominio del restaurante.
 *
 * ¿Por qué un módulo único de entidades? Son tipos puros (sin dependencias de
 * Angular ni de Supabase) que forman el vocabulario compartido de toda la app.
 * Mantenerlos juntos evita ciclos de imports entre capas y deja claro qué es
 * "dominio" y qué es infraestructura.
 */

/** Roles del personal. El cliente no tiene rol: nunca se autentica. */
export type StaffRole = 'admin' | 'mesero' | 'cocina' | 'cajero';

/** Turnos de sala, tal como los maneja el diseño original. */
export type Shift = 'manana' | 'tarde' | 'noche';

export type StaffStatus = 'activo' | 'vacaciones';

export type TableShape = 'sq' | 'rd';

export type TableStatus = 'libre' | 'ocupada' | 'reservada';

/** Flujo de una comanda: recibido → preparando → listo → entregado. */
export type OrderStatus = 'recibido' | 'preparando' | 'listo' | 'entregado';

export type Season = 'alta' | 'baja' | 'cerrado';

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  shift: Shift | null;
  status: StaffStatus;
  /** La cuenta propietaria no puede eliminarse (regla del diseño original). */
  isOwner: boolean;
  /** Números de mesa asignados al mesero. */
  tables: number[];
}

export interface Category {
  id: number;
  name: string;
  position: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number | null;
  categoryName: string;
  available: boolean;
  imageUrl: string | null;
}

export interface RestaurantTable {
  id: number;
  number: number;
  x: number;
  y: number;
  seats: number;
  shape: TableShape;
  status: TableStatus;
  /** Mesero asignado a la mesa (id de profiles), o null si nadie. */
  waiterId: string | null;
  /** Números originales cuando la mesa es resultado de una fusión. */
  mergedNumbers: number[] | null;
  /**
   * Copia de las dos mesas originales para poder separarlas después.
   * Solo vive en memoria durante la sesión de edición del plano.
   */
  backup?: { a: RestaurantTable; b: RestaurantTable } | null;
}

export interface OrderItem {
  productId: number | null;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  tableNumber: number;
  /** Id del mesero asignado; el nombre se resuelve en la capa de aplicación. */
  waiterId?: string | null;
  waiterName: string;
  status: OrderStatus;
  /** Etiqueta legible de la hora de creación (HH:MM). */
  createdAt: string;
  /** Época (ms) de creación, para el temporizador de cocina en vivo. */
  createdAtMs: number;
  /** Época (ms) en que se marcó "listo"; null si aún no. Para el tiempo de cocina. */
  readyAtMs: number | null;
  items: OrderItem[];
  /** Cobro: si está pagado, con qué método y cuándo (lo registra el cajero). */
  paid: boolean;
  paymentMethod: string | null;
  paidAt: string | null;
  /** true si el pedido fue creado por el cliente actual (vista QR). */
  mine?: boolean;
}

/** Método de pago configurable por el administrador (efectivo, tarjeta, …). */
export interface PaymentMethod {
  id: number;
  name: string;
  active: boolean;
  position: number;
}

export interface WaiterCall {
  id: number;
  tableNumber: number;
  attended: boolean;
  createdAt: string;
}

export interface RestaurantSettings {
  name: string;
  isOpen: boolean;
  season: Season;
  seasonStart: string | null;
  seasonEnd: string | null;
  /** Logo del restaurante (URL pública en Storage), o null si no hay. */
  logoUrl: string | null;
}

/** Total de una comanda; vive en el dominio para no duplicar la regla en cada vista. */
export function orderTotal(order: Order): number {
  return order.items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
}

/** El restaurante acepta pedidos solo si está abierto y no está cerrado por temporada. */
export function isAcceptingOrders(settings: RestaurantSettings): boolean {
  return settings.isOpen && settings.season !== 'cerrado';
}

/** Minutos transcurridos desde que entró el pedido (para el temporizador de cocina). */
export function elapsedMinutes(order: Order, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - order.createdAtMs) / 60000));
}

/** Minutos de preparación (creación → listo); null si aún no está listo. */
export function prepMinutes(order: Order): number | null {
  if (order.readyAtMs == null) return null;
  return Math.max(0, Math.round((order.readyAtMs - order.createdAtMs) / 60000));
}
