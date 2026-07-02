/**
 * Métricas del restaurante (funciones puras del dominio).
 *
 * ¿Por qué aquí y no en el componente? Son cálculos de negocio deterministas
 * (ingresos, ticket medio, ventas por método, top de productos). Aislarlos como
 * funciones puras permite probarlos sin montar la vista y reutilizarlos.
 */
import { orderTotal, type Order } from './entities/entities';

export interface SalesByMethod {
  method: string;
  total: number;
  count: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

/** Solo los pedidos cobrados cuentan como ingreso realizado. */
function paidOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.paid);
}

/** Ingreso total cobrado. */
export function totalRevenue(orders: Order[]): number {
  return paidOrders(orders).reduce((acc, o) => acc + orderTotal(o), 0);
}

/** Ticket medio = ingreso / número de pedidos cobrados (0 si no hay). */
export function averageTicket(orders: Order[]): number {
  const paid = paidOrders(orders);
  return paid.length ? totalRevenue(orders) / paid.length : 0;
}

/** Ventas agrupadas por método de pago, de mayor a menor importe. */
export function salesByMethod(orders: Order[]): SalesByMethod[] {
  const map = new Map<string, SalesByMethod>();
  for (const order of paidOrders(orders)) {
    const method = order.paymentMethod ?? 'Sin método';
    const entry = map.get(method) ?? { method, total: 0, count: 0 };
    entry.total += orderTotal(order);
    entry.count += 1;
    map.set(method, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/**
 * Productos más vendidos por cantidad. Se cuentan todas las líneas de todos los
 * pedidos (no solo los cobrados), para reflejar la demanda real de la cocina.
 */
export function topProducts(orders: Order[], limit = 5): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const order of orders) {
    for (const item of order.items) {
      const entry = map.get(item.productName) ?? { name: item.productName, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.unitPrice * item.quantity;
      map.set(item.productName, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}
