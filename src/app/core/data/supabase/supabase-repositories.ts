/**
 * Implementación de los repositorios sobre Supabase (Postgres + Auth + Realtime).
 *
 * Cada método traduce entre el modelo de la base (snake_case, ids de auth) y
 * las entidades del dominio (camelCase). Las reglas de autorización viven en
 * las políticas RLS del servidor (supabase/migrations/..._rls.sql); aquí solo
 * se hacen las llamadas.
 */
import { Injectable, inject } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './runtime-config';

/** Cliente sin sesión: el menú QR debe operar como rol `anon` aunque haya staff logueado. */
function createQrClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
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
  type AddStaffResult,
  StorageRepository,
  TablesRepository,
  WorkScheduleRepository,
  type SessionUser,
} from '../../domain/repositories/repositories';
import { SupabaseClientService } from './supabase-client.service';
import { RestaurantContextService } from '../../application/restaurant-context.service';
import { buildKitchenAccountEmail, isKitchenSystemEmail } from '../../auth/kitchen-auth';

/** Formatea la hora de creación como la muestra el diseño (HH:MM). */
function toTimeLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Injectable()
export class SupabaseMenuRepository extends MenuRepository {
  private supabase = inject(SupabaseClientService);
  private context = inject(RestaurantContextService);

  async getCategories(): Promise<Category[]> {
    const rId = this.context.restaurantId();
    const base = this.supabase.client.from('categories').select('id, name, position').order('position');
    const { data, error } = await (rId ? base.eq('restaurant_id', rId) : base);
    if (error) throw error;
    return data ?? [];
  }

  async addCategory(name: string): Promise<Category> {
    const rId = this.context.restaurantId();
    const { data, error } = await this.supabase.client
      .from('categories')
      .insert({ name, restaurant_id: rId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteCategory(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  async getProducts(): Promise<Product[]> {
    const rId = this.context.restaurantId();
    const base = this.supabase.client
      .from('products')
      .select('id, name, description, price, available, image_url, category_id, categories(name)')
      .order('id');
    const { data, error } = await (rId ? base.eq('restaurant_id', rId) : base);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      categoryId: row.category_id,
      categoryName: (row.categories as unknown as { name: string } | null)?.name ?? '',
      available: row.available,
      imageUrl: row.image_url,
    }));
  }

  async addProduct(input: {
    name: string;
    price: number;
    categoryId: number | null;
    description?: string;
  }): Promise<Product> {
    const rId = this.context.restaurantId();
    const { data, error } = await this.supabase.client
      .from('products')
      .insert({
        name: input.name,
        price: input.price,
        category_id: input.categoryId,
        description: input.description ?? 'Nuevo platillo de la casa.',
        restaurant_id: rId,
      })
      .select('id, name, description, price, available, image_url, category_id, categories(name)')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      categoryId: data.category_id,
      categoryName: (data.categories as unknown as { name: string } | null)?.name ?? '',
      available: data.available,
      imageUrl: data.image_url,
    };
  }

  async updateProduct(
    id: number,
    input: { name: string; price: number; categoryId: number | null; description?: string },
  ): Promise<Product> {
    const { data, error } = await this.supabase.client
      .from('products')
      .update({
        name: input.name,
        price: input.price,
        category_id: input.categoryId,
        description: input.description ?? 'Nuevo platillo de la casa.',
      })
      .eq('id', id)
      .select('id, name, description, price, available, image_url, category_id, categories(name)')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      categoryId: data.category_id,
      categoryName: (data.categories as unknown as { name: string } | null)?.name ?? '',
      available: data.available,
      imageUrl: data.image_url,
    };
  }

  async deleteProduct(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async setProductAvailability(id: number, available: boolean): Promise<void> {
    const { error } = await this.supabase.client.from('products').update({ available }).eq('id', id);
    if (error) throw error;
  }

  async setProductImage(id: number, imageUrl: string | null): Promise<void> {
    const { error } = await this.supabase.client.from('products').update({ image_url: imageUrl }).eq('id', id);
    if (error) throw error;
  }
}

@Injectable()
export class SupabaseTablesRepository extends TablesRepository {
  private supabase = inject(SupabaseClientService);
  private context = inject(RestaurantContextService);

  private map(row: Record<string, unknown>): RestaurantTable {
    return {
      id: row['id'] as number,
      number: row['number'] as number,
      x: row['x'] as number,
      y: row['y'] as number,
      seats: row['seats'] as number,
      shape: row['shape'] as RestaurantTable['shape'],
      status: row['status'] as RestaurantTable['status'],
      waiterId: (row['waiter_id'] as string | null) ?? null,
      mergedNumbers: (row['merged_numbers'] as number[] | null) ?? null,
    };
  }

  async getTables(): Promise<RestaurantTable[]> {
    const rId = this.context.restaurantId();
    const base = this.supabase.client.from('tables').select('*').order('number');
    const { data, error } = await (rId ? base.eq('restaurant_id', rId) : base);
    if (error) throw error;
    return (data ?? []).map((r) => this.map(r));
  }

  async saveTable(table: RestaurantTable): Promise<RestaurantTable> {
    const { error } = await this.supabase.client
      .from('tables')
      .update({
        number: table.number,
        x: table.x,
        y: table.y,
        seats: table.seats,
        shape: table.shape,
        status: table.status,
        waiter_id: table.waiterId,
        merged_numbers: table.mergedNumbers,
      })
      .eq('id', table.id);
    if (error) throw error;
    return table;
  }

  async addTable(table: Omit<RestaurantTable, 'id'>): Promise<RestaurantTable> {
    const rId = this.context.restaurantId();
    const { data, error } = await this.supabase.client
      .from('tables')
      .insert({
        number: table.number,
        x: table.x,
        y: table.y,
        seats: table.seats,
        shape: table.shape,
        status: table.status,
        restaurant_id: rId,
      })
      .select()
      .single();
    if (error) throw error;
    return this.map(data);
  }

  async deleteTable(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('tables').delete().eq('id', id);
    if (error) throw error;
  }
}

@Injectable()
export class SupabaseOrdersRepository extends OrdersRepository {
  private supabase = inject(SupabaseClientService);
  private context = inject(RestaurantContextService);

  async getOrders(): Promise<Order[]> {
    const rId = this.context.restaurantId();
    const client = await this.clientForOrders();
    const base = client
      .from('orders')
      .select(
        'id, table_number, waiter_id, status, created_at, ready_at, paid, payment_method, paid_at, order_items(product_id, product_name, unit_price, quantity)',
      )
      .order('created_at', { ascending: false });
    const { data, error } = await (rId ? base.eq('restaurant_id', rId) : base);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      tableNumber: row.table_number,
      waiterId: row.waiter_id,
      waiterName: '—',
      status: row.status as OrderStatus,
      createdAt: toTimeLabel(row.created_at),
      createdAtMs: Date.parse(row.created_at),
      readyAtMs: row.ready_at ? Date.parse(row.ready_at) : null,
      paid: row.paid ?? false,
      paymentMethod: row.payment_method ?? null,
      paidAt: row.paid_at ? toTimeLabel(row.paid_at) : null,
      items: (row.order_items as unknown as Array<Record<string, unknown>>).map((it) => ({
        productId: it['product_id'] as number | null,
        productName: it['product_name'] as string,
        unitPrice: Number(it['unit_price']),
        quantity: it['quantity'] as number,
      })),
    }));
  }

  async placeOrder(tableNumber: number, items: OrderItem[]): Promise<Order> {
    const rId = this.context.restaurantId();
    if (!rId) throw new Error('No hay restaurante en contexto');
    const qr = createQrClient();
    const { data, error } = await qr
      .from('orders')
      .insert({ table_number: tableNumber, source: 'qr', restaurant_id: rId })
      .select()
      .single();
    if (error) throw error;
    const { error: itemsError } = await qr.from('order_items').insert(
      items.map((it) => ({
        order_id: data.id,
        product_id: it.productId,
        product_name: it.productName,
        unit_price: it.unitPrice,
        quantity: it.quantity,
      })),
    );
    if (itemsError) throw itemsError;
    return {
      id: data.id,
      tableNumber,
      waiterName: '—',
      status: 'recibido',
      createdAt: 'ahora',
      createdAtMs: Date.now(),
      readyAtMs: null,
      paid: false,
      paymentMethod: null,
      paidAt: null,
      items,
    };
  }

  async setStatus(orderId: number, status: OrderStatus): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (status === 'listo') patch['ready_at'] = new Date().toISOString();
    const client = await this.clientForOrders();
    const { error } = await client.from('orders').update(patch).eq('id', orderId);
    if (error) throw error;
  }

  /** Solo personal autenticado puede leer o avanzar comandas (cocina, mesero, admin, cajero). */
  private async clientForOrders() {
    const { data } = await this.supabase.client.auth.getSession();
    if (!data.session) {
      throw new Error('Se requiere sesión de personal para operar pedidos');
    }
    return this.supabase.client;
  }

  async chargeOrder(orderId: number, paymentMethod: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('orders')
      .update({ paid: true, payment_method: paymentMethod, paid_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) throw error;
  }

  onChange(listener: () => void): () => void {
    const channel = this.supabase.client
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, listener)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, listener)
      .subscribe();
    return () => {
      void this.supabase.client.removeChannel(channel);
    };
  }
}

@Injectable()
export class SupabaseCallsRepository extends CallsRepository {
  private supabase = inject(SupabaseClientService);
  private context = inject(RestaurantContextService);

  async getCalls(): Promise<WaiterCall[]> {
    const rId = this.context.restaurantId();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const base = this.supabase.client
      .from('waiter_calls')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    const { data, error } = await (rId ? base.eq('restaurant_id', rId) : base);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      tableNumber: row.table_number,
      attended: row.attended,
      createdAt: toTimeLabel(row.created_at),
    }));
  }

  async createCall(tableNumber: number): Promise<WaiterCall> {
    const rId = this.context.restaurantId();
    if (!rId) throw new Error('No hay restaurante en contexto');

    const qr = createQrClient();
    const { data: table, error: tableError } = await qr
      .from('tables')
      .select('id')
      .eq('restaurant_id', rId)
      .eq('number', tableNumber)
      .maybeSingle();
    if (tableError) throw tableError;
    if (!table) {
      throw new Error(`La mesa ${tableNumber} no existe. Usa una mesa del plano o abre /tu-slug/mesa/N.`);
    }

    const { error } = await qr
      .from('waiter_calls')
      .insert({ table_number: tableNumber, restaurant_id: rId });
    if (error) throw error;
    return {
      id: -Date.now(),
      tableNumber,
      attended: false,
      createdAt: 'ahora',
    };
  }

  async attendCall(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('waiter_calls')
      .update({ attended: true })
      .eq('id', id);
    if (error) throw error;
  }

  onChange(listener: () => void): () => void {
    const channel = this.supabase.client
      .channel('calls-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls' }, listener)
      .subscribe();
    return () => {
      void this.supabase.client.removeChannel(channel);
    };
  }
}

@Injectable()
export class SupabaseStaffRepository extends StaffRepository {
  private supabase = inject(SupabaseClientService);
  private context = inject(RestaurantContextService);

  async getStaff(): Promise<StaffMember[]> {
    const rId = this.context.restaurantId();
    const base = this.supabase.client.from('profiles').select('*').order('created_at');
    const { data, error } = await (rId ? base.eq('restaurant_id', rId) : base);
    if (error) throw error;
    return (data ?? [])
      .filter((row) => !isKitchenSystemEmail(row.email ?? ''))
      .map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email ?? '',
      role: row.role as StaffRole,
      shift: row.shift as Shift | null,
      status: row.status,
      isOwner: row.is_owner,
      tables: [],
    }));
  }

  /**
   * Crea la cuenta en Supabase Auth (trigger `handle_new_user` → perfil) sin
   * cerrar la sesión del admin (cliente efímero sin persistir sesión).
   */
  async addStaff(input: {
    fullName: string;
    email: string;
    role: StaffRole;
    shift?: Shift;
    password?: string;
  }): Promise<AddStaffResult> {
    const rId = this.context.restaurantId();
    const email = input.email.trim();
    if (!rId) throw new Error('No hay restaurante en contexto');
    if (!email) throw new Error('El correo es obligatorio para dar de alta al personal');

    const initialPassword = input.password?.trim() || randomStaffPassword();
    const { url, anonKey } = getSupabaseConfig();
    const signupClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data, error } = await signupClient.auth.signUp({
      email,
      password: initialPassword,
      options: {
        data: {
          full_name: input.fullName,
          role: input.role,
          restaurant_id: rId,
        },
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        throw new Error('Ese correo ya tiene una cuenta. Usa otro correo o invítalo desde Supabase.');
      }
      throw error;
    }
    if (!data.user) throw new Error('No se pudo crear la cuenta del empleado');

    if (input.shift) {
      const { error: shiftError } = await this.supabase.client
        .from('profiles')
        .update({ shift: input.shift })
        .eq('id', data.user.id);
      if (shiftError) throw shiftError;
    }

    const { data: profile, error: profileError } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profileError) throw profileError;

    return {
      member: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email ?? email,
        role: profile.role as StaffRole,
        shift: profile.shift as Shift | null,
        status: profile.status,
        isOwner: profile.is_owner,
        tables: [],
      },
      initialPassword: input.password?.trim() ? undefined : initialPassword,
    };
  }

  async updateStaff(id: string, patch: Partial<Pick<StaffMember, 'role' | 'shift' | 'status'>>): Promise<void> {
    const { error } = await this.supabase.client
      .from('profiles')
      .update({ role: patch.role, shift: patch.shift, status: patch.status })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteStaffPermanently(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }

  async setStaffPassword(staffId: string, newPassword: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('admin_set_staff_password', {
      p_user_id: staffId,
      p_new_password: newPassword,
    });
    if (error) throw error;
  }

  /** El admin define el PIN de la tablet de cocina (6 dígitos). */
  async setKitchenPin(pin: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('admin_set_kitchen_pin', { p_pin: pin });
    if (error) throw error;
    // Asegura identity de login tras crear la cuenta cocina.
    const rId = this.context.restaurantId();
    if (rId) {
      await this.supabase.client.rpc('ensure_kitchen_account', { p_restaurant_id: rId });
    }
  }
}

@Injectable()
export class SupabaseSettingsRepository extends SettingsRepository {
  private supabase = inject(SupabaseClientService);
  private context = inject(RestaurantContextService);

  async getSettings(): Promise<RestaurantSettings> {
    const rId = this.context.restaurantId();
    const base = this.supabase.client.from('restaurant_settings').select('*');
    const q = rId ? base.eq('restaurant_id', rId) : base;
    const { data, error } = await q.single();
    if (error) throw error;
    return {
      name: data.name,
      isOpen: data.is_open,
      season: data.season,
      seasonStart: data.season_start,
      seasonEnd: data.season_end,
      logoUrl: data.logo_url ?? null,
      currency: data.currency ?? '$',
      kitchenPinSet: Boolean(data.kitchen_pin_set),
    };
  }

  async isKitchenPinSet(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.kitchenPinSet;
  }

  async updateSettings(patch: Partial<RestaurantSettings>): Promise<void> {
    const rId = this.context.restaurantId();
    const base = this.supabase.client.from('restaurant_settings').update({
      name: patch.name,
      is_open: patch.isOpen,
      season: patch.season,
      season_start: patch.seasonStart,
      season_end: patch.seasonEnd,
      logo_url: patch.logoUrl,
      currency: patch.currency,
    });
    const { error } = await (rId ? base.eq('restaurant_id', rId) : base);
    if (error) throw error;
  }
}

@Injectable()
export class SupabaseAuthRepository extends AuthRepository {
  private supabase = inject(SupabaseClientService);
  private context = inject(RestaurantContextService);

  private async toSessionUser(userId: string, email: string): Promise<SessionUser> {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('full_name, role, restaurant_id')
      .eq('id', userId)
      .single();
    return {
      id: userId,
      email,
      fullName: data?.full_name ?? email,
      role: (data?.role as StaffRole) ?? 'mesero',
      restaurantId: (data?.restaurant_id as string) ?? '',
    };
  }

  async signIn(email: string, password: string): Promise<SessionUser> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw error ?? new Error('No se pudo iniciar sesión');
    return this.toSessionUser(data.user.id, data.user.email ?? email);
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
  }

  async getCurrentUser(): Promise<SessionUser | null> {
    const { data } = await this.supabase.client.auth.getUser();
    if (!data.user) return null;
    return this.toSessionUser(data.user.id, data.user.email ?? '');
  }

  async adminExists(restaurantId?: string): Promise<boolean> {
    const { data, error } = await this.supabase.client.rpc('admin_exists', {
      p_restaurant_id: restaurantId ?? null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  /**
   * Registra al primer administrador de un restaurante ya creado. El trigger
   * `handle_new_user` lo marca como admin+propietario al ser el primer perfil
   * del restaurante. Si se requiere confirmación de correo devuelve null.
   */
  async signUpFirstAdmin(input: {
    fullName: string;
    email: string;
    password: string;
    restaurantId: string;
  }): Promise<SessionUser | null> {
    const { data, error } = await this.supabase.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName, role: 'admin', restaurant_id: input.restaurantId } },
    });
    if (error) throw error;
    if (!data.session || !data.user) return null;
    return this.toSessionUser(data.user.id, data.user.email ?? input.email);
  }

  async changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
    const { data } = await this.supabase.client.auth.getUser();
    const email = data.user?.email;
    if (!email) throw new Error('No hay sesión activa');

    const { url, anonKey } = getSupabaseConfig();
    const verifyClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) throw new Error('La contraseña actual no es correcta');

    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async signInKitchen(restaurantId: string, pin: string): Promise<SessionUser> {
    const email = buildKitchenAccountEmail(restaurantId);
    const { error: ensureError } = await this.supabase.client.rpc('ensure_kitchen_account', {
      p_restaurant_id: restaurantId,
    });
    if (ensureError) throw ensureError;

    const { data: pinOk, error: pinError } = await this.supabase.client.rpc('kitchen_pin_is_valid', {
      p_restaurant_id: restaurantId,
      p_pin: pin,
    });
    if (pinError) throw pinError;
    if (!pinOk) {
      throw new Error('PIN incorrecto. Vuelve a guardarlo en Admin → Ajustes → Tablet de cocina.');
    }

    await this.supabase.client.auth.signOut();
    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password: pin });
    if (error || !data.user) {
      throw new Error(
        'No se pudo abrir sesión de cocina. Ejecuta public/setup/patch-kitchen-identity-fix.sql en Supabase.',
      );
    }
    return this.toSessionUser(data.user.id, data.user.email ?? email);
  }
}

@Injectable()
export class SupabaseRestaurantRepository extends RestaurantRepository {
  private supabase = inject(SupabaseClientService);

  /** Llama al RPC `create_restaurant(name, slug)` y devuelve el UUID nuevo. */
  async create(name: string, slug: string): Promise<string> {
    const { data, error } = await this.supabase.client.rpc('create_restaurant', {
      p_name: name,
      p_slug: slug,
    });
    if (error) throw error;
    return data as string;
  }

  /** Resuelve el slug de la URL al restaurante correspondiente. */
  async getBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null> {
    const { data, error } = await this.supabase.client.rpc('restaurant_by_slug', { p_slug: slug });
    if (error) throw error;
    const row = (data as Array<{ id: string; name: string; slug: string }> | null)?.[0];
    return row ?? null;
  }

  /**
   * Cliente sin slug (`/` o `/mesa/:numero`): resuelve el primer restaurante
   * disponible. Usa la policy pública `select` de `restaurants`.
   */
  async getFirstAvailable(): Promise<{ id: string; name: string; slug: string } | null> {
    const { data, error } = await this.supabase.client
      .from('restaurants')
      .select('id, name, slug')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async getById(id: string): Promise<{ id: string; name: string; slug: string } | null> {
    const { data, error } = await this.supabase.client
      .from('restaurants')
      .select('id, name, slug')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async countRestaurants(): Promise<number> {
    const { data, error } = await this.supabase.client.rpc('count_operational_restaurants');
    if (error) throw error;
    return (data as number) ?? 0;
  }

  async countKitchenTenants(): Promise<number> {
    const { data, error } = await this.supabase.client.rpc('count_kitchen_url_tenants');
    if (!error && data != null) return data as number;
    return 1;
  }

  async resolveForKitchen(slug?: string | null): Promise<{ id: string; name: string; slug: string } | null> {
    const { data, error } = await this.supabase.client.rpc('resolve_kitchen_restaurant', {
      p_slug: slug ?? null,
    });
    if (error) {
      if (slug) return this.getBySlug(slug);
      return this.getFirstAvailable();
    }
    const row = (data as Array<{ id: string; name: string; slug: string }> | null)?.[0];
    return row ?? null;
  }
}

@Injectable()
export class SupabaseStorageRepository extends StorageRepository {
  private supabase = inject(SupabaseClientService);

  async uploadImage(file: File, folder: 'productos' | 'logo'): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.supabase.client.storage
      .from('imagenes')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = this.supabase.client.storage.from('imagenes').getPublicUrl(path);
    return data.publicUrl;
  }
}

@Injectable()
export class SupabasePaymentsRepository extends PaymentsRepository {
  private supabase = inject(SupabaseClientService);

  async getMethods(): Promise<PaymentMethod[]> {
    const { data, error } = await this.supabase.client
      .from('payment_methods')
      .select('*')
      .order('position');
    if (error) throw error;
    return data ?? [];
  }

  async addMethod(name: string): Promise<PaymentMethod> {
    const { data, error } = await this.supabase.client
      .from('payment_methods')
      .insert({ name })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async setActive(id: number, active: boolean): Promise<void> {
    const { error } = await this.supabase.client.from('payment_methods').update({ active }).eq('id', id);
    if (error) throw error;
  }

  async deleteMethod(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('payment_methods').delete().eq('id', id);
    if (error) throw error;
  }
}

@Injectable()
export class SupabaseWorkScheduleRepository extends WorkScheduleRepository {
  private supabase = inject(SupabaseClientService);
  private context = inject(RestaurantContextService);

  async getSchedules(): Promise<WorkSchedule[]> {
    const rId = this.context.restaurantId();
    const base = this.supabase.client.from('work_schedules').select('staff_id, days');
    const { data, error } = await (rId ? base.eq('restaurant_id', rId) : base);
    if (error) throw error;
    return (data ?? []).map((row) => ({ staffId: row.staff_id as string, days: row.days as WorkSchedule['days'] }));
  }

  async saveSchedule(schedule: WorkSchedule): Promise<void> {
    const rId = this.context.restaurantId();
    const { error } = await this.supabase.client
      .from('work_schedules')
      .upsert(
        { restaurant_id: rId, staff_id: schedule.staffId, days: schedule.days, updated_at: new Date().toISOString() },
        { onConflict: 'staff_id' },
      );
    if (error) throw error;
  }
}

/** Contraseña temporal que cumple requisitos mínimos de Supabase Auth. */
function randomStaffPassword(): string {
  const base = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return `${base}Aa1!`;
}
