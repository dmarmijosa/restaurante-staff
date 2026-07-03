import { describe, expect, it } from 'vitest';
import {
  averagePrepMinutes,
  averageTicket,
  ordersInRange,
  salesByMethod,
  topProducts,
  totalRevenue,
} from './metrics';
import type { Order } from './entities/entities';

function order(partial: Partial<Order>): Order {
  return {
    id: 1,
    tableNumber: 1,
    waiterName: '—',
    status: 'entregado',
    createdAt: '12:00',
    createdAtMs: 0,
    readyAtMs: null,
    paid: false,
    paymentMethod: null,
    paidAt: null,
    items: [],
    ...partial,
  };
}

const orders: Order[] = [
  order({
    id: 1, paid: true, paymentMethod: 'Efectivo',
    items: [{ productId: 1, productName: 'Tacos', unitPrice: 10, quantity: 2 }], // 20
  }),
  order({
    id: 2, paid: true, paymentMethod: 'Tarjeta',
    items: [{ productId: 2, productName: 'Sopa', unitPrice: 8, quantity: 1 }], // 8
  }),
  order({
    id: 3, paid: true, paymentMethod: 'Efectivo',
    items: [{ productId: 1, productName: 'Tacos', unitPrice: 10, quantity: 1 }], // 10
  }),
  order({
    id: 4, paid: false, // no cobrado: no cuenta como ingreso
    items: [{ productId: 3, productName: 'Flan', unitPrice: 5, quantity: 3 }],
  }),
];

describe('metrics', () => {
  it('totalRevenue suma solo los pedidos cobrados', () => {
    expect(totalRevenue(orders)).toBe(38); // 20 + 8 + 10
  });

  it('averageTicket divide entre pedidos cobrados', () => {
    expect(averageTicket(orders)).toBeCloseTo(38 / 3, 5);
    expect(averageTicket([])).toBe(0);
  });

  it('salesByMethod agrupa por método y ordena por importe', () => {
    const byMethod = salesByMethod(orders);
    expect(byMethod[0]).toEqual({ method: 'Efectivo', total: 30, count: 2 });
    expect(byMethod[1]).toEqual({ method: 'Tarjeta', total: 8, count: 1 });
  });

  it('topProducts cuenta todas las líneas (incluye no cobrados) por cantidad', () => {
    const top = topProducts(orders);
    expect(top.find((p) => p.name === 'Flan')).toEqual({ name: 'Flan', quantity: 3, revenue: 15 });
    expect(top.find((p) => p.name === 'Tacos')).toEqual({ name: 'Tacos', quantity: 3, revenue: 30 });
    expect(top.find((p) => p.name === 'Sopa')).toEqual({ name: 'Sopa', quantity: 1, revenue: 8 });
  });

  it('ordersInRange filtra por época de creación', () => {
    const set = [
      order({ id: 1, createdAtMs: 100 }),
      order({ id: 2, createdAtMs: 200 }),
      order({ id: 3, createdAtMs: 300 }),
    ];
    expect(ordersInRange(set, 200).map((o) => o.id)).toEqual([2, 3]);
    expect(ordersInRange(set, 150, 250).map((o) => o.id)).toEqual([2]);
    expect(ordersInRange(set, 0).length).toBe(3);
  });

  it('averagePrepMinutes promedia el tiempo recibido → listo', () => {
    const MIN = 60_000;
    const timed = [
      order({ id: 1, createdAtMs: 0, readyAtMs: 10 * MIN }), // 10 min
      order({ id: 2, createdAtMs: 0, readyAtMs: 20 * MIN }), // 20 min
      order({ id: 3, createdAtMs: 0, readyAtMs: null }), // aún en cocina: no cuenta
    ];
    expect(averagePrepMinutes(timed)).toBe(15);
    expect(averagePrepMinutes([order({ readyAtMs: null })])).toBeNull();
  });
});
