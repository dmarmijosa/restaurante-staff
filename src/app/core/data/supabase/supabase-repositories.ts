/**
 * Implementación de los repositorios sobre Supabase (Postgres + Auth + Realtime).
 *
 * Cada método traduce entre el modelo de la base (snake_case, ids de auth) y
 * las entidades del dominio (camelCase). Las reglas de autorización viven en
 * las políticas RLS del servidor (supabase/migrations/..._rls.sql); aquí solo
 * se hacen las llamadas.
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
  type SessionUser,
} from '../../domain/repositories/repositories';
import { SupabaseClientService } from './supabase-client.service';
import { RestaurantContextService } from '../../application/restaurant-context.service';

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
    const { data, error } = await this.supabase.client
      .from('tables')
      .insert({
        number: table.number,
        x: table.x,
        y: table.y,
        seats: table.seats,
        shape: table.shape,
        status: table.status,
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
    // No se incrusta profiles(full_name): privacidad del personal.
    const rId = this.context.restaurantId();
    const base = this.supabase.client
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
    const { data, error } = await this.supabase.client
      .from('orders')
      .insert({ table_number: tableNumber, source: 'qr', restaurant_id: rId })
      .select()
      .single();
    if (error) throw error;
    const { error: itemsError } = await this.supabase.client.from('order_items').insert(
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
    // Al pasar a "listo" se sella ready_at para medir el tiempo de cocina.
    const patch: Record<string, unknown> = { status };
    if (status === 'listo') patch['ready_at'] = new Date().toISOString();
    const { error } = await this.supabase.client.from('orders').update(patch).eq('id', orderId);
    if (error) throw error;
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

  async getPendingCalls(): Promise<WaiterCall[]> {
    const rId = this.context.restaurantId();
    const base = this.supabase.client
      .from('waiter_calls')
      .select('*')
      .eq('attended', false)
      .order('created_at');
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
    const { data, error } = await this.supabase.client
      .from('waiter_calls')
      .insert({ table_number: tableNumber, restaurant_id: rId })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, tableNumber, attended: false, createdAt: 'ahora' };
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
    const { data, error } = await this.supabase.client.from('profiles').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map((row) => ({
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
   * El alta real de credenciales se hace en Supabase Auth (dashboard o
   * invitación); aquí solo se registra el perfil operativo para que el admin
   * gestione rol y turno.
   */
  async addStaff(input: { fullName: string; email: string; role: StaffRole; shift?: Shift }): Promise<StaffMember> {
    const rId = this.context.restaurantId();
    const { data, error } = await this.supabase.client
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        full_name: input.fullName,
        email: input.email,
        role: input.role,
        shift: input.shift ?? null,
        restaurant_id: rId,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email ?? '',
      role: data.role,
      shift: data.shift,
      status: data.status,
      isOwner: data.is_owner,
      tables: [],
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
    };
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
