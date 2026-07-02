/**
 * Pruebas del store global usando los repositorios demo reales (en memoria):
 * validan las reglas de negocio del diseño sin mocks frágiles.
 */
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RestaurantStore } from './restaurant.store';
import {
  AuthRepository,
  CallsRepository,
  MenuRepository,
  OrdersRepository,
  SettingsRepository,
  StaffRepository,
  TablesRepository,
} from '../domain/repositories/repositories';
import {
  DemoAuthRepository,
  DemoCallsRepository,
  DemoMenuRepository,
  DemoOrdersRepository,
  DemoSettingsRepository,
  DemoStaffRepository,
  DemoTablesRepository,
} from '../data/demo/demo-repositories';

describe('RestaurantStore', () => {
  let store: RestaurantStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MenuRepository, useClass: DemoMenuRepository },
        { provide: TablesRepository, useClass: DemoTablesRepository },
        { provide: OrdersRepository, useClass: DemoOrdersRepository },
        { provide: CallsRepository, useClass: DemoCallsRepository },
        { provide: StaffRepository, useClass: DemoStaffRepository },
        { provide: SettingsRepository, useClass: DemoSettingsRepository },
        { provide: AuthRepository, useClass: DemoAuthRepository },
      ],
    });
    store = TestBed.inject(RestaurantStore);
    await store.init();
  });

  it('carga los datos de ejemplo del diseño', () => {
    expect(store.tables()).toHaveLength(8);
    expect(store.products()).toHaveLength(11);
    expect(store.categories().map((c) => c.name)).toEqual(['Entradas', 'Principales', 'Postres', 'Bebidas']);
    expect(store.settings().name).toBe('Casa Nogal');
  });

  it('avanza una comanda por el flujo recibido → preparando → listo → entregado', async () => {
    const id = 1043; // pedido "recibido" del seed
    await store.advanceOrder(id);
    expect(store.orders().find((o) => o.id === id)?.status).toBe('preparando');
    await store.advanceOrder(id);
    await store.advanceOrder(id);
    expect(store.orders().find((o) => o.id === id)?.status).toBe('entregado');
    // No avanza más allá del estado final.
    await store.advanceOrder(id);
    expect(store.orders().find((o) => o.id === id)?.status).toBe('entregado');
  });

  it('el pedido del cliente QR entra a la cola de cocina', async () => {
    const before = store.kitchenOrders().length;
    const order = await store.placeOrder(4, [
      { productId: 5, productName: 'Tacos de costilla', unitPrice: 11, quantity: 2 },
    ]);
    expect(order.status).toBe('recibido');
    expect(store.kitchenOrders().length).toBe(before + 1);
  });

  it('fusiona dos mesas sumando sillas y puede separarlas después', async () => {
    const merged = await store.mergeTables(1, 2); // 4 + 2 sillas
    expect(merged?.seats).toBe(6);
    expect(merged?.mergedNumbers).toEqual([1, 2]);
    expect(store.tables()).toHaveLength(7);

    await store.splitTable(merged!.id);
    expect(store.tables()).toHaveLength(8);
  });

  it('no elimina una categoría con productos dentro', async () => {
    const entradas = store.categories().find((c) => c.name === 'Entradas')!;
    await store.deleteCategory(entradas.id);
    expect(store.categories().some((c) => c.name === 'Entradas')).toBe(true);
  });

  it('protección de datos: elimina personal de forma permanente, salvo la cuenta propietaria', async () => {
    const waiter = store.staff().find((s) => s.fullName === 'Marta Solís')!;
    await store.deleteStaffPermanently(waiter.id);
    expect(store.staff().some((s) => s.id === waiter.id)).toBe(false);

    const owner = store.staff().find((s) => s.isOwner)!;
    await store.deleteStaffPermanently(owner.id);
    expect(store.staff().some((s) => s.id === owner.id)).toBe(true);
  });

  it('el admin puede cambiar el rol de una cuenta', async () => {
    const member = store.staff().find((s) => s.fullName === 'Carlos Mena')!;
    await store.setRole(member.id, 'cocina');
    expect(store.staff().find((s) => s.id === member.id)?.role).toBe('cocina');
  });

  it('cerrar el restaurante detiene la aceptación de pedidos del QR', async () => {
    expect(store.acceptingOrders()).toBe(true);
    await store.toggleOpen();
    expect(store.acceptingOrders()).toBe(false);
    await store.toggleOpen();
    await store.setSeason('cerrado');
    expect(store.acceptingOrders()).toBe(false);
  });
});
