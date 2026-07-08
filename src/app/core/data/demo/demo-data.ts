/**
 * Datos de ejemplo — son exactamente los del diseño original "Restaurante
 * Staff", para que el modo demo (sin claves de Supabase) luzca idéntico al
 * mockup y cualquiera pueda evaluar el proyecto open source sin registrarse.
 */
import type {
  Category,
  Order,
  PaymentMethod,
  Product,
  RestaurantSettings,
  RestaurantTable,
  StaffMember,
  WaiterCall,
  WorkSchedule,
} from '../../domain/entities/entities';

/** UUID fijo del restaurante demo (en memoria, sin Supabase). */
export const DEMO_RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

export const DEMO_CATEGORIES: Category[] = [
  { id: 1, name: 'Entradas', position: 1 },
  { id: 2, name: 'Principales', position: 2 },
  { id: 3, name: 'Postres', position: 3 },
  { id: 4, name: 'Bebidas', position: 4 },
];

export const DEMO_PRODUCTS: Product[] = [
  { id: 1, name: 'Tostadas de tinga', description: 'Pollo deshebrado, crema ácida y aguacate.', price: 6.5, categoryId: 1, categoryName: 'Entradas', available: true, imageUrl: null },
  { id: 2, name: 'Sopa de tortilla', description: 'Caldo de jitomate, chile pasilla y queso fresco.', price: 7, categoryId: 1, categoryName: 'Entradas', available: true, imageUrl: null },
  { id: 3, name: 'Croquetas de elote', description: 'Con alioli de chipotle ahumado.', price: 5, categoryId: 1, categoryName: 'Entradas', available: false, imageUrl: null },
  { id: 4, name: 'Pollo al carbón con mole', description: 'Media pieza, arroz rojo y tortillas de maíz.', price: 14.5, categoryId: 2, categoryName: 'Principales', available: true, imageUrl: null },
  { id: 5, name: 'Tacos de costilla', description: 'Tres piezas, salsa tatemada y cebollitas.', price: 11, categoryId: 2, categoryName: 'Principales', available: true, imageUrl: null },
  { id: 6, name: 'Risotto de hongos', description: 'Hongos de temporada y parmesano.', price: 13, categoryId: 2, categoryName: 'Principales', available: true, imageUrl: null },
  { id: 7, name: 'Pesca del día a la brasa', description: 'Con verduras rostizadas y limón quemado.', price: 16.5, categoryId: 2, categoryName: 'Principales', available: true, imageUrl: null },
  { id: 8, name: 'Flan de la casa', description: 'Caramelo oscuro y crema batida.', price: 5.5, categoryId: 3, categoryName: 'Postres', available: true, imageUrl: null },
  { id: 9, name: 'Tarta de elote', description: 'Con helado de vainilla de vaina.', price: 6, categoryId: 3, categoryName: 'Postres', available: true, imageUrl: null },
  { id: 10, name: 'Agua fresca de jamaica', description: 'Endulzada con piloncillo.', price: 3, categoryId: 4, categoryName: 'Bebidas', available: true, imageUrl: null },
  { id: 11, name: 'Limonada de hierbabuena', description: 'Mineral o natural.', price: 3.5, categoryId: 4, categoryName: 'Bebidas', available: true, imageUrl: null },
];

export const DEMO_TABLES: RestaurantTable[] = [
  { id: 1, number: 1, x: 40, y: 40, seats: 4, shape: 'sq', status: 'libre', waiterId: 'w2', mergedNumbers: null },
  { id: 2, number: 2, x: 230, y: 60, seats: 2, shape: 'rd', status: 'ocupada', waiterId: 'w1', mergedNumbers: null },
  { id: 3, number: 3, x: 400, y: 40, seats: 4, shape: 'sq', status: 'ocupada', waiterId: 'w2', mergedNumbers: null },
  { id: 4, number: 4, x: 590, y: 80, seats: 4, shape: 'sq', status: 'ocupada', waiterId: 'w1', mergedNumbers: null },
  { id: 5, number: 5, x: 70, y: 230, seats: 6, shape: 'sq', status: 'reservada', waiterId: 'w3', mergedNumbers: null },
  { id: 6, number: 6, x: 330, y: 250, seats: 4, shape: 'rd', status: 'ocupada', waiterId: 'w1', mergedNumbers: null },
  { id: 7, number: 7, x: 600, y: 280, seats: 2, shape: 'rd', status: 'ocupada', waiterId: 'w1', mergedNumbers: null },
  { id: 8, number: 8, x: 160, y: 410, seats: 8, shape: 'sq', status: 'libre', waiterId: 'w3', mergedNumbers: null },
];

export const DEMO_STAFF: StaffMember[] = [
  { id: 'w1', fullName: 'Carlos Mena', email: 'carlos@casanogal.mx', role: 'mesero', shift: 'tarde', status: 'activo', isOwner: false, tables: [2, 4, 6, 7] },
  { id: 'w2', fullName: 'Lucía Fernández', email: 'lucia@casanogal.mx', role: 'mesero', shift: 'manana', status: 'activo', isOwner: false, tables: [1, 3] },
  { id: 'w3', fullName: 'Diego Paredes', email: 'diego@casanogal.mx', role: 'mesero', shift: 'noche', status: 'activo', isOwner: false, tables: [5, 8] },
  { id: 'w4', fullName: 'Marta Solís', email: 'marta@casanogal.mx', role: 'mesero', shift: 'manana', status: 'vacaciones', isOwner: false, tables: [] },
  { id: 'a1', fullName: 'Ana Ríos', email: 'ana@casanogal.mx', role: 'admin', shift: null, status: 'activo', isOwner: true, tables: [] },
  { id: 'a2', fullName: 'Jorge Luna', email: 'jorge@casanogal.mx', role: 'admin', shift: null, status: 'activo', isOwner: false, tables: [] },
  { id: 'k1', fullName: 'Chef Robles', email: 'chef@casanogal.mx', role: 'cocina', shift: 'tarde', status: 'activo', isOwner: false, tables: [] },
  { id: 'c1', fullName: 'Paola Vega', email: 'paola@casanogal.mx', role: 'cajero', shift: 'tarde', status: 'activo', isOwner: false, tables: [] },
];

/** Métodos de pago de ejemplo (los que el admin configura). */
export const DEMO_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 1, name: 'Efectivo', active: true, position: 1 },
  { id: 2, name: 'Tarjeta', active: true, position: 2 },
  { id: 3, name: 'Transferencia', active: true, position: 3 },
];

const MIN = 60_000;
const NOW = Date.now();

export const DEMO_ORDERS: Order[] = [
  {
    id: 1043, tableNumber: 6, waiterName: 'Carlos M.', status: 'recibido', createdAt: '19:31',
    createdAtMs: NOW - 6 * MIN, readyAtMs: null,
    paid: false, paymentMethod: null, paidAt: null,
    items: [
      { productId: 7, productName: 'Pesca del día a la brasa', unitPrice: 16.5, quantity: 1 },
      { productId: 2, productName: 'Sopa de tortilla', unitPrice: 7, quantity: 2 },
    ],
  },
  {
    id: 1042, tableNumber: 2, waiterName: 'Carlos M.', status: 'preparando', createdAt: '19:20',
    createdAtMs: NOW - 17 * MIN, readyAtMs: null,
    paid: false, paymentMethod: null, paidAt: null,
    items: [
      { productId: 6, productName: 'Risotto de hongos', unitPrice: 13, quantity: 1 },
      { productId: 11, productName: 'Limonada de hierbabuena', unitPrice: 3.5, quantity: 1 },
    ],
  },
  {
    id: 1041, tableNumber: 3, waiterName: 'Lucía F.', status: 'listo', createdAt: '19:12',
    createdAtMs: NOW - 25 * MIN, readyAtMs: NOW - 13 * MIN,
    paid: false, paymentMethod: null, paidAt: null,
    items: [
      { productId: 5, productName: 'Tacos de costilla', unitPrice: 11, quantity: 2 },
      { productId: 10, productName: 'Agua fresca de jamaica', unitPrice: 3, quantity: 1 },
    ],
  },
  {
    id: 1039, tableNumber: 5, waiterName: 'Diego P.', status: 'entregado', createdAt: '18:47',
    createdAtMs: NOW - 50 * MIN, readyAtMs: NOW - 41 * MIN,
    paid: true, paymentMethod: 'Tarjeta', paidAt: '18:55',
    items: [{ productId: 4, productName: 'Pollo al carbón con mole', unitPrice: 14.5, quantity: 1 }],
  },
];

export const DEMO_CALLS: WaiterCall[] = [
  { id: 1, tableNumber: 7, attended: false, createdAt: 'hace 2 min' },
];

export const DEMO_SETTINGS: RestaurantSettings = {
  name: 'Casa Nogal',
  isOpen: true,
  season: 'alta',
  seasonStart: '2026-03-15',
  seasonEnd: '2026-09-15',
  logoUrl: null,
  currency: '$',
};

/** Horarios semanales de ejemplo (lunes→domingo). */
export const DEMO_SCHEDULES: WorkSchedule[] = [
  {
    staffId: 'w1',
    days: [
      { off: false, start: '14:00', end: '20:00' },
      { off: false, start: '14:00', end: '20:00' },
      { off: false, start: '14:00', end: '20:00' },
      { off: false, start: '14:00', end: '20:00' },
      { off: false, start: '14:00', end: '22:00' },
      { off: false, start: '14:00', end: '22:00' },
      { off: true, start: '09:00', end: '17:00' },
    ],
  },
  {
    staffId: 'w2',
    days: [
      { off: false, start: '08:00', end: '14:00' },
      { off: false, start: '08:00', end: '14:00' },
      { off: true, start: '08:00', end: '14:00' },
      { off: false, start: '08:00', end: '14:00' },
      { off: false, start: '08:00', end: '14:00' },
      { off: false, start: '08:00', end: '14:00' },
      { off: false, start: '10:00', end: '16:00' },
    ],
  },
  {
    staffId: 'k1',
    days: [
      { off: false, start: '13:00', end: '21:00' },
      { off: false, start: '13:00', end: '21:00' },
      { off: false, start: '13:00', end: '21:00' },
      { off: true, start: '13:00', end: '21:00' },
      { off: false, start: '13:00', end: '23:00' },
      { off: false, start: '13:00', end: '23:00' },
      { off: false, start: '13:00', end: '21:00' },
    ],
  },
  {
    staffId: 'c1',
    days: [
      { off: false, start: '14:00', end: '22:00' },
      { off: false, start: '14:00', end: '22:00' },
      { off: false, start: '14:00', end: '22:00' },
      { off: false, start: '14:00', end: '22:00' },
      { off: false, start: '14:00', end: '23:00' },
      { off: false, start: '14:00', end: '23:00' },
      { off: true, start: '09:00', end: '17:00' },
    ],
  },
];

/** Credenciales aceptadas por el modo demo (solo para probar la app). */
export const DEMO_USERS = [
  { email: 'admin@demo.dev', password: 'admin123', staffId: 'a1' },
  { email: 'mesero@demo.dev', password: 'mesero123', staffId: 'w1' },
  { email: 'cocina@demo.dev', password: 'cocina123', staffId: 'k1' },
  { email: 'cajero@demo.dev', password: 'cajero123', staffId: 'c1' },
];
