-- ============================================================================
-- Restaurante Staff · Esquema completo
-- Generado por scripts/build-schema.mjs — no editar a mano.
-- Migraciones incluidas: 19 (seed demo antes de multi-tenant).
-- Aplicar en el SQL Editor de tu proyecto Supabase (o con `supabase db push`).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260702000001_init.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Restaurante Staff · Esquema inicial
-- Proyecto Supabase: vtkdvxrocemdyybynegs
-- Aplicar con: supabase db push  (o pegar en el SQL Editor del dashboard)
-- ============================================================================

-- ── Perfiles de personal (extiende auth.users) ─────────────────────────────
-- El administrador define el rol de cada cuenta: admin, mesero o cocina.
-- El cliente NO tiene cuenta: consume el menú público sin autenticarse.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  role text not null default 'mesero' check (role in ('admin', 'mesero', 'cocina')),
  shift text check (shift in ('manana', 'tarde', 'noche')),
  status text not null default 'activo' check (status in ('activo', 'vacaciones')),
  is_owner boolean not null default false, -- la cuenta propietaria no puede eliminarse
  created_at timestamptz not null default now()
);

-- ── Ajustes del restaurante (fila única) ────────────────────────────────────
create table public.restaurant_settings (
  id integer primary key default 1 check (id = 1),
  name text not null default 'Casa Nogal',
  is_open boolean not null default true,
  season text not null default 'alta' check (season in ('alta', 'baja', 'cerrado')),
  season_start date,
  season_end date,
  updated_at timestamptz not null default now()
);

insert into public.restaurant_settings (id) values (1);

-- ── Categorías y productos del menú ─────────────────────────────────────────
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  position integer not null default 0
);

create table public.products (
  id bigint generated always as identity primary key,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null default 0 check (price >= 0),
  category_id bigint references public.categories (id) on delete set null,
  available boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

-- ── Mesas del salón ──────────────────────────────────────────────────────────
create table public.tables (
  id bigint generated always as identity primary key,
  number integer not null,
  x integer not null default 30,
  y integer not null default 30,
  seats integer not null default 4 check (seats between 1 and 24),
  shape text not null default 'sq' check (shape in ('sq', 'rd')),
  status text not null default 'libre' check (status in ('libre', 'ocupada', 'reservada')),
  merged_numbers integer[], -- números originales si la mesa es una fusión
  waiter_id uuid references public.profiles (id) on delete set null
);

-- ── Pedidos y sus líneas ─────────────────────────────────────────────────────
create table public.orders (
  id bigint generated always as identity primary key,
  table_number integer not null,
  waiter_id uuid references public.profiles (id) on delete set null,
  status text not null default 'recibido'
    check (status in ('recibido', 'preparando', 'listo', 'entregado')),
  source text not null default 'qr' check (source in ('qr', 'staff')),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  -- snapshot del nombre y precio: si el producto cambia después, el pedido
  -- conserva lo que el cliente pidió realmente
  product_name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

-- ── Llamadas al mesero (desde el QR de la mesa) ─────────────────────────────
create table public.waiter_calls (
  id bigint generated always as identity primary key,
  table_number integer not null,
  attended boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Realtime: las vistas de cocina/mesero/admin se actualizan en vivo
-- ============================================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.waiter_calls;
alter publication supabase_realtime add table public.tables;

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260702000002_rls.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Restaurante Staff · Seguridad (RLS)
--
-- Modelo de acceso:
--   · anon (cliente QR, sin cuenta): lee menú/ajustes/mesas; crea pedidos y
--     llamadas al mesero; lee el estado de pedidos QR.
--   · mesero / cocina: leen todo lo operativo y avanzan estados de pedidos.
--   · admin: control total, incluida la eliminación PERMANENTE de perfiles de
--     meseros y cocina (derecho de supresión — protección de datos).
-- ============================================================================

-- Helper: rol del usuario autenticado, evitando recursión en policies.
-- Se llama app_current_role (no current_role) porque este último es palabra
-- reservada de SQL en Postgres.
create or replace function public.app_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_current_role() = 'admin', false);
$$;

-- Las funciones helper SECURITY DEFINER solo se usan dentro de las políticas
-- RLS; se revoca su ejecución como RPC público (siguen evaluándose en las
-- policies porque corren con el propietario de la función).
revoke execute on function public.app_current_role() from anon, authenticated, public;
revoke execute on function public.is_staff() from anon, authenticated, public;
revoke execute on function public.is_admin() from anon, authenticated, public;

alter table public.profiles enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.waiter_calls enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
create policy "staff lee perfiles" on public.profiles
  for select using (public.is_staff());
create policy "admin gestiona perfiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());
-- Derecho de supresión: solo admin borra perfiles, nunca la cuenta propietaria.
create policy "admin elimina perfiles no propietarios" on public.profiles
  as restrictive for delete using (not is_owner);

-- ── restaurant_settings ─────────────────────────────────────────────────────
create policy "todos leen ajustes" on public.restaurant_settings
  for select using (true);
create policy "admin edita ajustes" on public.restaurant_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ── categories / products (menú público) ───────────────────────────────────
create policy "todos leen categorias" on public.categories
  for select using (true);
create policy "admin gestiona categorias" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "todos leen productos" on public.products
  for select using (true);
create policy "admin gestiona productos" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ── tables ──────────────────────────────────────────────────────────────────
create policy "todos leen mesas" on public.tables
  for select using (true);
create policy "staff actualiza mesas" on public.tables
  for update using (public.is_staff()) with check (public.is_staff());
create policy "admin gestiona mesas" on public.tables
  for all using (public.is_admin()) with check (public.is_admin());

-- ── orders / order_items ────────────────────────────────────────────────────
-- El cliente anónimo crea su pedido desde el QR y consulta su estado.
create policy "todos leen pedidos" on public.orders
  for select using (true);
create policy "cliente crea pedido qr" on public.orders
  for insert with check (source = 'qr' or public.is_staff());
create policy "staff avanza pedidos" on public.orders
  for update using (public.is_staff()) with check (public.is_staff());
create policy "admin elimina pedidos" on public.orders
  for delete using (public.is_admin());

create policy "todos leen lineas" on public.order_items
  for select using (true);
-- El anónimo solo agrega líneas contra un pedido que existe (no ids inventados).
create policy "cliente agrega lineas" on public.order_items
  for insert with check (exists (select 1 from public.orders o where o.id = order_id));
create policy "admin elimina lineas" on public.order_items
  for delete using (public.is_admin());

-- ── waiter_calls ────────────────────────────────────────────────────────────
create policy "todos leen llamadas" on public.waiter_calls
  for select using (true);
-- El anónimo solo puede llamar desde una mesa que existe.
create policy "cliente llama al mesero" on public.waiter_calls
  for insert with check (exists (select 1 from public.tables t where t.number = table_number));
create policy "staff atiende llamadas" on public.waiter_calls
  for update using (public.is_staff()) with check (public.is_staff());

-- ============================================================================
-- Alta automática de perfil al registrarse un usuario en Auth.
-- El admin ajusta luego el rol desde el panel (Ajustes → roles).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'mesero')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260702000003_bootstrap_admin_and_storage.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Bootstrap del primer administrador + bucket de imágenes
-- ============================================================================

-- ¿Existe ya algún administrador? Callable por anon: el formulario de registro
-- inicial la usa ANTES de autenticar para decidir si mostrarse.
create or replace function public.admin_exists()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where role = 'admin');
$$;
grant execute on function public.admin_exists() to anon, authenticated;

-- El PRIMER usuario que se registra se convierte en admin propietario; los
-- siguientes toman el rol de sus metadatos (o 'mesero'). Así el registro
-- inicial solo "funciona como admin" una vez.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, full_name, email, role, is_owner)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when is_first then 'admin' else coalesce(new.raw_user_meta_data ->> 'role', 'mesero') end,
    is_first
  );
  return new;
end;
$$;

-- ── Bucket público de imágenes (fotos de productos y logo) ──────────────────
insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;

-- Lectura pública (el menú del cliente muestra las fotos sin login).
create policy "imagenes lectura publica" on storage.objects
  for select using (bucket_id = 'imagenes');
-- Solo el admin sube/actualiza/borra imágenes.
create policy "imagenes admin inserta" on storage.objects
  for insert to authenticated with check (bucket_id = 'imagenes' and public.is_admin());
create policy "imagenes admin actualiza" on storage.objects
  for update to authenticated using (bucket_id = 'imagenes' and public.is_admin());
create policy "imagenes admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'imagenes' and public.is_admin());

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260702000004_add_logo_url.sql
-- ────────────────────────────────────────────────────────────────────────
-- Logo del restaurante (URL en el bucket 'imagenes'); lo sube el admin desde
-- Ajustes y se muestra en el panel, la tablet del mesero y el menú del cliente.
alter table public.restaurant_settings add column if not exists logo_url text;

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260702000005_cajero_role_and_payments.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Rol Cajero + métodos de pago + cobro de pedidos
-- ============================================================================

-- 1) Añadir 'cajero' a los roles permitidos.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'mesero', 'cocina', 'cajero'));

-- 2) Métodos de pago que el administrador configura (efectivo, tarjeta, etc.).
create table if not exists public.payment_methods (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean not null default true,
  position integer not null default 0
);
insert into public.payment_methods (name, position) values
  ('Efectivo', 1), ('Tarjeta', 2), ('Transferencia', 3)
on conflict (name) do nothing;

-- 3) Campos de cobro en los pedidos.
alter table public.orders add column if not exists paid boolean not null default false;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists paid_at timestamptz;

-- 4) RLS de payment_methods: lectura pública, escritura solo admin.
alter table public.payment_methods enable row level security;
create policy "todos leen metodos de pago" on public.payment_methods
  for select using (true);
create policy "admin gestiona metodos de pago" on public.payment_methods
  for all using (public.is_admin()) with check (public.is_admin());

-- Realtime del cobro para el resto de vistas.
alter publication supabase_realtime add table public.payment_methods;

-- Nota: el cobro (orders.paid/payment_method/paid_at) lo hace el personal a
-- través de la política existente "staff avanza pedidos" (UPDATE para is_staff),
-- que ya cubre al rol cajero.

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260702000006_order_ready_at.sql
-- ────────────────────────────────────────────────────────────────────────
-- Momento en que la cocina marca el pedido como "listo". Sirve para medir el
-- tiempo de preparación (created_at → ready_at) en el Resumen del admin.
alter table public.orders add column if not exists ready_at timestamptz;

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260703000007_daily_demo_reset.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Reinicio diario de datos de demostración (pg_cron)
--
-- Objetivo: que la app se use con normalidad durante el día y cada madrugada
-- vuelva a un estado semilla, para demostrar Supabase de forma reproducible.
-- IMPORTANTE: NO toca cuentas (auth.users / profiles); solo datos operativos.
--
-- Para DESACTIVARlo en un despliegue real:
--   select cron.unschedule('reset-demo-diario');
-- ============================================================================

create extension if not exists pg_cron;

create or replace function public.reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Pedidos, líneas, cobros y llamadas: se vacían por completo.
  truncate table public.order_items, public.orders, public.waiter_calls restart identity cascade;

  -- Menú: se reconstruye desde cero.
  truncate table public.products restart identity cascade;
  truncate table public.categories restart identity cascade;
  insert into public.categories (name, position) values
    ('Entradas', 1), ('Principales', 2), ('Postres', 3), ('Bebidas', 4);
  insert into public.products (name, description, price, category_id, available) values
    ('Tostadas de tinga', 'Pollo deshebrado, crema ácida y aguacate.', 6.50, 1, true),
    ('Sopa de tortilla', 'Caldo de jitomate, chile pasilla y queso fresco.', 7.00, 1, true),
    ('Croquetas de elote', 'Con alioli de chipotle ahumado.', 5.00, 1, false),
    ('Pollo al carbón con mole', 'Media pieza, arroz rojo y tortillas de maíz.', 14.50, 2, true),
    ('Tacos de costilla', 'Tres piezas, salsa tatemada y cebollitas.', 11.00, 2, true),
    ('Risotto de hongos', 'Hongos de temporada y parmesano.', 13.00, 2, true),
    ('Pesca del día a la brasa', 'Con verduras rostizadas y limón quemado.', 16.50, 2, true),
    ('Flan de la casa', 'Caramelo oscuro y crema batida.', 5.50, 3, true),
    ('Tarta de elote', 'Con helado de vainilla de vaina.', 6.00, 3, true),
    ('Agua fresca de jamaica', 'Endulzada con piloncillo.', 3.00, 4, true),
    ('Limonada de hierbabuena', 'Mineral o natural.', 3.50, 4, true);

  -- Mesas del salón: posiciones y estados de la semilla.
  truncate table public.tables restart identity cascade;
  insert into public.tables (number, x, y, seats, shape, status) values
    (1, 40, 40, 4, 'sq', 'libre'),
    (2, 230, 60, 2, 'rd', 'ocupada'),
    (3, 400, 40, 4, 'sq', 'ocupada'),
    (4, 590, 80, 4, 'sq', 'ocupada'),
    (5, 70, 230, 6, 'sq', 'reservada'),
    (6, 330, 250, 4, 'rd', 'ocupada'),
    (7, 600, 280, 2, 'rd', 'ocupada'),
    (8, 160, 410, 8, 'sq', 'libre');

  -- Métodos de pago por defecto.
  truncate table public.payment_methods restart identity cascade;
  insert into public.payment_methods (name, position) values
    ('Efectivo', 1), ('Tarjeta', 2), ('Transferencia', 3);

  -- Ajustes del restaurante a su estado inicial de demo.
  update public.restaurant_settings
  set name = 'Casa Nogal', is_open = true, season = 'alta',
      season_start = '2026-03-15', season_end = '2026-09-15', logo_url = null, updated_at = now()
  where id = 1;
end;
$$;

-- Solo procesos internos deben ejecutarla; no se expone a anon/authenticated.
revoke execute on function public.reset_demo_data() from anon, authenticated, public;

-- Programación diaria a las 08:00 UTC. Reprogramable / desactivable con cron.
select cron.schedule('reset-demo-diario', '0 8 * * *', $$select public.reset_demo_data();$$);

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260703000008_disable_public_signup.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Cierre del registro público tras el bootstrap del administrador
-- ============================================================================
-- Motivo (ADR relacionado): el primer usuario que llega a /registro-inicial
-- se convierte en admin propietario. A partir de ese momento nadie más puede
-- registrarse en la app por su cuenta: el acceso del equipo lo gestiona el
-- admin desde el panel de Supabase (Authentication → Users → Invite user).
-- Las invitaciones del dashboard tienen 'invited_at' en raw_app_meta_data,
-- lo que permite distinguirlas de los registros públicos directos.
-- ============================================================================

-- ── Función de control de acceso al registro ─────────────────────────────────
create or replace function public.check_signup_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Siempre permitir mientras no exista un administrador propietario
  -- (necesario para el bootstrap inicial del restaurante).
  if not exists (select 1 from public.profiles where is_owner = true) then
    return new;
  end if;

  -- Invitaciones enviadas desde el panel de Supabase (Authentication → Invite):
  -- tienen 'invited_at' en raw_app_meta_data; se permiten para que el admin
  -- pueda dar acceso al equipo sin abrir el registro público.
  if (new.raw_app_meta_data->>'invited_at') is not null then
    return new;
  end if;

  raise exception
    'El registro público está desactivado. Pide al administrador del restaurante que te invite desde el panel de Supabase.'
    using errcode = 'P0002';
end;
$$;

-- ── Disparador previo al INSERT en auth.users ────────────────────────────────
-- Se ejecuta antes de cada registro de cuenta, tanto desde la app como desde
-- llamadas directas a la API. No afecta a actualizaciones ni borrados.
create trigger on_auth_signup_check
  before insert on auth.users
  for each row execute function public.check_signup_allowed();

-- ────────────────────────────────────────────────────────────────────────
-- Datos de ejemplo (seed) — la migración 9 los adopta al restaurante default
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Restaurante Staff · Datos de ejemplo (los mismos del diseño original)
-- ============================================================================

insert into public.categories (name, position) values
  ('Entradas', 1), ('Principales', 2), ('Postres', 3), ('Bebidas', 4);

insert into public.products (name, description, price, category_id, available) values
  ('Tostadas de tinga', 'Pollo deshebrado, crema ácida y aguacate.', 6.50, 1, true),
  ('Sopa de tortilla', 'Caldo de jitomate, chile pasilla y queso fresco.', 7.00, 1, true),
  ('Croquetas de elote', 'Con alioli de chipotle ahumado.', 5.00, 1, false),
  ('Pollo al carbón con mole', 'Media pieza, arroz rojo y tortillas de maíz.', 14.50, 2, true),
  ('Tacos de costilla', 'Tres piezas, salsa tatemada y cebollitas.', 11.00, 2, true),
  ('Risotto de hongos', 'Hongos de temporada y parmesano.', 13.00, 2, true),
  ('Pesca del día a la brasa', 'Con verduras rostizadas y limón quemado.', 16.50, 2, true),
  ('Flan de la casa', 'Caramelo oscuro y crema batida.', 5.50, 3, true),
  ('Tarta de elote', 'Con helado de vainilla de vaina.', 6.00, 3, true),
  ('Agua fresca de jamaica', 'Endulzada con piloncillo.', 3.00, 4, true),
  ('Limonada de hierbabuena', 'Mineral o natural.', 3.50, 4, true);

insert into public.tables (number, x, y, seats, shape, status) values
  (1, 40, 40, 4, 'sq', 'libre'),
  (2, 230, 60, 2, 'rd', 'ocupada'),
  (3, 400, 40, 4, 'sq', 'ocupada'),
  (4, 590, 80, 4, 'sq', 'ocupada'),
  (5, 70, 230, 6, 'sq', 'reservada'),
  (6, 330, 250, 4, 'rd', 'ocupada'),
  (7, 600, 280, 2, 'rd', 'ocupada'),
  (8, 160, 410, 8, 'sq', 'libre');

update public.restaurant_settings
set season_start = '2026-03-15', season_end = '2026-09-15'
where id = 1;

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260704000009_multi_restaurante.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Multi-restaurante (multi-tenant)
-- Un despliegue, varios locales.
--
-- Estrategia:
--   · Nueva tabla `restaurants` como raíz de cada tenant.
--   · `restaurant_id` FK en todas las tablas de negocio.
--   · RLS actualizado: autenticados ven solo su restaurante (my_restaurant_id());
--     el anon (cliente QR) filtra por restaurant_id en la query.
--   · `create_restaurant(name, slug)` → UUID: RPC público que el formulario de
--     bootstrap llama antes de hacer signUp, creando el restaurante y sus
--     ajustes iniciales.
--   · `restaurant_by_slug(slug)` → fila: RPC público para que el cliente QR
--     resuelva el slug de la URL a un restaurant_id.
--   · `handle_new_user` actualizado: lee restaurant_id del user_metadata y
--     hace admin+propietario al primer perfil de ese restaurante.
--   · `check_signup_allowed` actualizado: permite signup cuando el
--     restaurant_id del metadata es un restaurante válido, o hay invited_at.
-- ============================================================================

-- ── 1. Tabla de restaurantes ─────────────────────────────────────────────────
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- RLS básico: cualquiera puede leer la lista (necesario para resolver slugs).
alter table public.restaurants enable row level security;
create policy "todos leen restaurantes" on public.restaurants
  for select using (true);

-- ── 2. Crear restaurante por defecto con los datos existentes ─────────────────
do $$
declare
  v_restaurant_id uuid := gen_random_uuid();
  v_name text;
  v_slug text;
begin
  select name into v_name from public.restaurant_settings limit 1;
  v_name := coalesce(v_name, 'Mi restaurante');
  v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');

  insert into public.restaurants (id, name, slug)
  values (v_restaurant_id, v_name, v_slug)
  on conflict (slug) do update set name = excluded.name;

  -- ── 3. Añadir restaurant_id a todas las tablas de negocio ──────────────────
  -- Las columnas se crean nullable para poder hacer el backfill antes de NOT NULL.

  alter table public.profiles add column if not exists restaurant_id uuid
    references public.restaurants(id) on delete cascade;

  alter table public.restaurant_settings add column if not exists restaurant_id uuid
    references public.restaurants(id) on delete cascade;

  alter table public.categories add column if not exists restaurant_id uuid
    references public.restaurants(id) on delete cascade;

  alter table public.products add column if not exists restaurant_id uuid
    references public.restaurants(id) on delete cascade;

  alter table public.tables add column if not exists restaurant_id uuid
    references public.restaurants(id) on delete cascade;

  alter table public.orders add column if not exists restaurant_id uuid
    references public.restaurants(id) on delete cascade;

  alter table public.waiter_calls add column if not exists restaurant_id uuid
    references public.restaurants(id) on delete cascade;

  alter table public.payment_methods add column if not exists restaurant_id uuid
    references public.restaurants(id) on delete cascade;

  -- ── 4. Backfill: asociar datos existentes al restaurante por defecto ─────
  update public.profiles        set restaurant_id = v_restaurant_id where restaurant_id is null;
  update public.restaurant_settings set restaurant_id = v_restaurant_id where restaurant_id is null;
  update public.categories      set restaurant_id = v_restaurant_id where restaurant_id is null;
  update public.products        set restaurant_id = v_restaurant_id where restaurant_id is null;
  update public.tables          set restaurant_id = v_restaurant_id where restaurant_id is null;
  update public.orders          set restaurant_id = v_restaurant_id where restaurant_id is null;
  update public.waiter_calls    set restaurant_id = v_restaurant_id where restaurant_id is null;
  update public.payment_methods set restaurant_id = v_restaurant_id where restaurant_id is null;
end;
$$;

-- Requiere profiles.restaurant_id (creada en el bloque anterior).
create policy "admin gestiona su restaurante" on public.restaurants
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and restaurant_id = restaurants.id)
  );

-- ── 5. Hacer NOT NULL después del backfill ───────────────────────────────────
alter table public.profiles        alter column restaurant_id set not null;
alter table public.restaurant_settings alter column restaurant_id set not null;
alter table public.categories      alter column restaurant_id set not null;
alter table public.products        alter column restaurant_id set not null;
alter table public.tables          alter column restaurant_id set not null;
alter table public.orders          alter column restaurant_id set not null;
alter table public.waiter_calls    alter column restaurant_id set not null;
alter table public.payment_methods alter column restaurant_id set not null;

-- restaurant_settings: una fila por restaurante (reemplaza el singleton id=1).
alter table public.restaurant_settings
  add constraint restaurant_settings_restaurant_unique unique (restaurant_id);

-- ── 6. Función helper: id del restaurante del usuario autenticado ─────────────
create or replace function public.my_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.profiles where id = auth.uid();
$$;
revoke execute on function public.my_restaurant_id() from anon, authenticated, public;

-- ── 7. Actualizar políticas RLS para scope por restaurante ───────────────────
-- (se eliminan las existentes y se reemplazan con versiones multi-tenant)

-- profiles
drop policy if exists "staff lee perfiles" on public.profiles;
drop policy if exists "admin gestiona perfiles" on public.profiles;
drop policy if exists "admin elimina perfiles no propietarios" on public.profiles;

create policy "staff lee perfiles de su restaurante" on public.profiles
  for select using (public.is_staff() and restaurant_id = public.my_restaurant_id());
create policy "admin gestiona perfiles de su restaurante" on public.profiles
  for all using (public.is_admin() and restaurant_id = public.my_restaurant_id())
  with check (public.is_admin() and restaurant_id = public.my_restaurant_id());
create policy "admin elimina perfiles no propietarios" on public.profiles
  as restrictive for delete using (not is_owner);

-- restaurant_settings
drop policy if exists "todos leen ajustes" on public.restaurant_settings;
drop policy if exists "admin edita ajustes" on public.restaurant_settings;

create policy "anon lee ajustes" on public.restaurant_settings
  for select to anon using (true);
create policy "staff lee ajustes de su restaurante" on public.restaurant_settings
  for select to authenticated using (restaurant_id = public.my_restaurant_id());
create policy "admin edita ajustes de su restaurante" on public.restaurant_settings
  for update using (public.is_admin() and restaurant_id = public.my_restaurant_id())
  with check (public.is_admin() and restaurant_id = public.my_restaurant_id());

-- categories
drop policy if exists "todos leen categorias" on public.categories;
drop policy if exists "admin gestiona categorias" on public.categories;

create policy "anon lee categorias" on public.categories
  for select to anon using (true);
create policy "staff lee categorias de su restaurante" on public.categories
  for select to authenticated using (restaurant_id = public.my_restaurant_id());
create policy "admin gestiona categorias de su restaurante" on public.categories
  for all to authenticated using (public.is_admin() and restaurant_id = public.my_restaurant_id())
  with check (public.is_admin() and restaurant_id = public.my_restaurant_id());

-- products
drop policy if exists "todos leen productos" on public.products;
drop policy if exists "admin gestiona productos" on public.products;

create policy "anon lee productos" on public.products
  for select to anon using (true);
create policy "staff lee productos de su restaurante" on public.products
  for select to authenticated using (restaurant_id = public.my_restaurant_id());
create policy "admin gestiona productos de su restaurante" on public.products
  for all to authenticated using (public.is_admin() and restaurant_id = public.my_restaurant_id())
  with check (public.is_admin() and restaurant_id = public.my_restaurant_id());

-- tables
drop policy if exists "todos leen mesas" on public.tables;
drop policy if exists "staff actualiza mesas" on public.tables;
drop policy if exists "admin gestiona mesas" on public.tables;

create policy "anon lee mesas" on public.tables
  for select to anon using (true);
create policy "staff lee mesas de su restaurante" on public.tables
  for select to authenticated using (restaurant_id = public.my_restaurant_id());
create policy "staff actualiza mesas de su restaurante" on public.tables
  for update to authenticated using (public.is_staff() and restaurant_id = public.my_restaurant_id())
  with check (public.is_staff() and restaurant_id = public.my_restaurant_id());
create policy "admin gestiona mesas de su restaurante" on public.tables
  for all to authenticated using (public.is_admin() and restaurant_id = public.my_restaurant_id())
  with check (public.is_admin() and restaurant_id = public.my_restaurant_id());

-- orders
drop policy if exists "anon crea pedidos qr" on public.orders;
drop policy if exists "staff lee pedidos" on public.orders;
drop policy if exists "staff avanza pedidos" on public.orders;
drop policy if exists "anon lee sus pedidos qr" on public.orders;

create policy "anon crea pedidos qr" on public.orders
  for insert to anon with check (
    source = 'qr'
    and exists (select 1 from public.restaurants where id = restaurant_id)
    and exists (select 1 from public.tables t
                where t.restaurant_id = restaurant_id and t.number = table_number)
  );
create policy "anon lee sus pedidos qr" on public.orders
  for select to anon using (source = 'qr');
create policy "staff lee pedidos de su restaurante" on public.orders
  for select to authenticated using (restaurant_id = public.my_restaurant_id());
create policy "staff avanza pedidos de su restaurante" on public.orders
  for update to authenticated using (public.is_staff() and restaurant_id = public.my_restaurant_id())
  with check (public.is_staff() and restaurant_id = public.my_restaurant_id());

-- order_items (sin restaurant_id directo; heredan scope del order)
drop policy if exists "anon crea items qr" on public.order_items;
drop policy if exists "todos leen items de sus pedidos" on public.order_items;

create policy "anon crea items qr" on public.order_items
  for insert to anon with check (
    exists (select 1 from public.orders o where o.id = order_id and o.source = 'qr')
    and (product_id is null or exists (
      select 1 from public.products p
      join public.orders o on o.id = order_id
      where p.id = product_id and p.restaurant_id = o.restaurant_id
    ))
  );
create policy "todos leen items" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id)
  );

-- waiter_calls
drop policy if exists "anon crea llamadas" on public.waiter_calls;
drop policy if exists "staff lee llamadas" on public.waiter_calls;
drop policy if exists "staff atiende llamadas" on public.waiter_calls;

create policy "anon crea llamadas" on public.waiter_calls
  for insert to anon with check (
    exists (select 1 from public.restaurants where id = restaurant_id)
    and exists (select 1 from public.tables t
                where t.restaurant_id = restaurant_id and t.number = table_number)
  );
create policy "staff lee llamadas de su restaurante" on public.waiter_calls
  for select to authenticated using (restaurant_id = public.my_restaurant_id());
create policy "staff atiende llamadas de su restaurante" on public.waiter_calls
  for update to authenticated using (public.is_staff() and restaurant_id = public.my_restaurant_id())
  with check (public.is_staff() and restaurant_id = public.my_restaurant_id());

-- payment_methods
drop policy if exists "todos leen metodos de pago" on public.payment_methods;
drop policy if exists "admin gestiona metodos de pago" on public.payment_methods;

create policy "anon lee metodos de pago" on public.payment_methods
  for select to anon using (true);
create policy "staff lee metodos de su restaurante" on public.payment_methods
  for select to authenticated using (restaurant_id = public.my_restaurant_id());
create policy "admin gestiona metodos de su restaurante" on public.payment_methods
  for all to authenticated using (public.is_admin() and restaurant_id = public.my_restaurant_id())
  with check (public.is_admin() and restaurant_id = public.my_restaurant_id());

-- ── 8. RPC: crear un nuevo restaurante (público, antes de hacer signUp) ───────
create or replace function public.create_restaurant(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_slug text;
begin
  v_slug := trim(both '-' from regexp_replace(lower(trim(p_slug)), '[^a-z0-9]+', '-', 'g'));
  if length(v_slug) < 2 then
    raise exception 'El slug debe tener al menos 2 caracteres.';
  end if;

  insert into public.restaurants (name, slug)
  values (trim(p_name), v_slug)
  returning id into v_restaurant_id;

  -- Ajustes por defecto del nuevo restaurante
  insert into public.restaurant_settings (restaurant_id, name)
  values (v_restaurant_id, trim(p_name));

  return v_restaurant_id;
end;
$$;
grant execute on function public.create_restaurant(text, text) to anon, authenticated;

-- ── 9. RPC: resolver slug → datos del restaurante (cliente QR) ──────────────
create or replace function public.restaurant_by_slug(p_slug text)
returns table(id uuid, name text, slug text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, r.slug
  from public.restaurants r
  where r.slug = lower(trim(p_slug));
$$;
grant execute on function public.restaurant_by_slug(text) to anon, authenticated;

-- ── 10. Actualizar handle_new_user ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_is_first      boolean;
begin
  -- Leer restaurant_id del metadata enviado en el signUp.
  v_restaurant_id := (new.raw_user_meta_data->>'restaurant_id')::uuid;

  if v_restaurant_id is null then
    raise exception 'Falta restaurant_id en el registro. Usa /nuevo-restaurante para crear tu restaurante primero.';
  end if;

  -- ¿Es el primer perfil de este restaurante? → admin propietario.
  select not exists (
    select 1 from public.profiles where restaurant_id = v_restaurant_id
  ) into v_is_first;

  insert into public.profiles (id, full_name, email, role, is_owner, restaurant_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when v_is_first then 'admin' else coalesce(new.raw_user_meta_data->>'role', 'mesero') end,
    v_is_first,
    v_restaurant_id
  );
  return new;
end;
$$;

-- ── 11. Actualizar check_signup_allowed ──────────────────────────────────────
create or replace function public.check_signup_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  -- Las invitaciones del dashboard Supabase siempre se permiten.
  if (new.raw_app_meta_data->>'invited_at') is not null then
    return new;
  end if;

  -- Para registros directos: exigir un restaurant_id válido.
  v_restaurant_id := (new.raw_user_meta_data->>'restaurant_id')::uuid;

  if v_restaurant_id is null or not exists (
    select 1 from public.restaurants where id = v_restaurant_id
  ) then
    raise exception
      'Registro no autorizado: crea tu restaurante en /nuevo-restaurante antes de registrarte.'
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;

-- ── 12. admin_exists ahora es por restaurante ────────────────────────────────
create or replace function public.admin_exists(p_restaurant_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_restaurant_id is null then
      exists (select 1 from public.profiles where role = 'admin')
    else
      exists (select 1 from public.profiles where role = 'admin' and restaurant_id = p_restaurant_id)
  end;
$$;
grant execute on function public.admin_exists(uuid) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260707000010_work_schedules.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Horario de trabajo semanal por empleado (módulo "Horario de trabajo").
-- Un registro por trabajador con 7 días (lunes→domingo) en JSONB.
-- ============================================================================
create table if not exists public.work_schedules (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  days jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (staff_id)
);

alter table public.work_schedules enable row level security;

create policy "staff lee horarios" on public.work_schedules
  for select using (public.is_staff() and restaurant_id = public.my_restaurant_id());
create policy "admin gestiona horarios" on public.work_schedules
  for all using (public.is_admin() and restaurant_id = public.my_restaurant_id())
  with check (public.is_admin() and restaurant_id = public.my_restaurant_id());

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000011_add_currency.sql
-- ────────────────────────────────────────────────────────────────────────
-- Añade el símbolo de moneda configurable por el admin.
-- El valor por defecto '$' mantiene compatibilidad con datos existentes.
alter table public.restaurant_settings
  add column if not exists currency text not null default '$';

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000012_fix_rls_and_settings.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Arreglos post multi-restaurante
--
-- Problemas detectados en producción:
--   1. restaurant_settings.id sigue con CHECK (id = 1) y default 1 → no se
--      puede insertar una segunda fila cuando `create_restaurant()` intenta
--      crear los ajustes del nuevo tenant. Cambiamos a bigserial.
--   2. Policies legacy (pre multi-tenant) quedaron activas y hacen referencia a
--      `is_staff()` desde el rol `public`, lo que falla porque anon no tiene
--      EXECUTE sobre esa función (permission denied for function is_staff).
--      Se eliminan.
--   3. is_staff / is_admin se marcan como accesibles por anon y authenticated
--      (devolverán false para anon, pero deben poder ejecutarse dentro de
--      policies evaluadas para ese rol).
-- ============================================================================

-- ── 1. restaurant_settings.id — quitar singleton y usar bigserial ────────────
alter table public.restaurant_settings drop constraint if exists restaurant_settings_id_check;
alter table public.restaurant_settings alter column id drop default;

do $$
declare
  v_max bigint;
begin
  -- Crear una secuencia y hacer que id la use como default
  if not exists (select 1 from pg_class where relname = 'restaurant_settings_id_seq') then
    create sequence public.restaurant_settings_id_seq owned by public.restaurant_settings.id;
    select coalesce(max(id), 0) + 1 into v_max from public.restaurant_settings;
    perform setval('public.restaurant_settings_id_seq', v_max, false);
  end if;
  alter table public.restaurant_settings
    alter column id set default nextval('public.restaurant_settings_id_seq'::regclass);
end;
$$;

-- ── 2. Eliminar policies legacy pre multi-tenant ─────────────────────────────
-- orders
drop policy if exists "cliente crea pedido qr" on public.orders;
drop policy if exists "todos leen pedidos"      on public.orders;
drop policy if exists "admin elimina pedidos"   on public.orders;

-- order_items
drop policy if exists "cliente agrega lineas"   on public.order_items;
drop policy if exists "todos leen lineas"       on public.order_items;
drop policy if exists "todos leen items"        on public.order_items;
drop policy if exists "admin elimina lineas"    on public.order_items;

-- waiter_calls
drop policy if exists "cliente llama al mesero" on public.waiter_calls;
drop policy if exists "todos leen llamadas"     on public.waiter_calls;

-- Recrear las policies necesarias, versión multi-tenant sin las legacy
create policy "anon lee items sus pedidos" on public.order_items
  for select to anon using (
    exists (select 1 from public.orders o where o.id = order_id and o.source = 'qr')
  );
create policy "staff lee items de su restaurante" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.restaurant_id = public.my_restaurant_id()
    )
  );
create policy "admin elimina lineas de su restaurante" on public.order_items
  for delete to authenticated using (
    public.is_admin() and exists (
      select 1 from public.orders o
      where o.id = order_id and o.restaurant_id = public.my_restaurant_id()
    )
  );
create policy "admin elimina pedidos de su restaurante" on public.orders
  for delete to authenticated using (
    public.is_admin() and restaurant_id = public.my_restaurant_id()
  );

-- ── 3. Otorgar EXECUTE a is_staff / is_admin para todos los roles ────────────
-- Devuelven false para anon (no tiene auth.uid()), pero deben ser INVOCABLES
-- dentro de las políticas de RLS cuando el planner las evalúa.
grant execute on function public.is_staff()  to anon, authenticated;
grant execute on function public.is_admin()  to anon, authenticated;
-- my_restaurant_id sigue restringida (no la necesitan anon).

-- ── 4. Corregir bug del filtro en policy "anon crea llamadas" ────────────────
-- La versión anterior tenía `t.restaurant_id = t.restaurant_id` (tautología).
-- Debe filtrar por el restaurant_id de la fila insertada.
drop policy if exists "anon crea llamadas" on public.waiter_calls;
create policy "anon crea llamadas" on public.waiter_calls
  for insert to anon with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id)
    and exists (
      select 1 from public.tables t
      where t.restaurant_id = waiter_calls.restaurant_id
        and t.number = waiter_calls.table_number
    )
  );

-- Idéntico arreglo para "anon crea pedidos qr"
drop policy if exists "anon crea pedidos qr" on public.orders;
create policy "anon crea pedidos qr" on public.orders
  for insert to anon with check (
    source = 'qr'
    and exists (select 1 from public.restaurants r where r.id = restaurant_id)
    and exists (
      select 1 from public.tables t
      where t.restaurant_id = orders.restaurant_id
        and t.number = orders.table_number
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000013_reapply_signup_triggers.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Re-aplicar los triggers de Auth con la versión multi-tenant.
--
-- En proyectos ya desplegados que llegaron a la versión multi-tenant a través
-- de aplicaciones parciales, el trigger `handle_new_user` puede seguir siendo
-- la versión "pre multi-restaurante" (que no rellena `restaurant_id`). Como
-- `profiles.restaurant_id` es NOT NULL, cualquier signUp acaba en el genérico
-- "Database error saving new user" (HTTP 500 de GoTrue).
--
-- Esta migración fuerza la versión definitiva de ambos triggers y garantiza
-- que los disparadores en `auth.users` existan.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_is_first      boolean;
begin
  v_restaurant_id := (new.raw_user_meta_data->>'restaurant_id')::uuid;

  if v_restaurant_id is null then
    raise exception 'Falta restaurant_id en el registro. Crea tu restaurante primero.';
  end if;

  select not exists (
    select 1 from public.profiles where restaurant_id = v_restaurant_id
  ) into v_is_first;

  insert into public.profiles (id, full_name, email, role, is_owner, restaurant_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when v_is_first then 'admin' else coalesce(new.raw_user_meta_data->>'role', 'mesero') end,
    v_is_first,
    v_restaurant_id
  );
  return new;
end;
$$;

create or replace function public.check_signup_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  -- Invitaciones desde el dashboard de Supabase → siempre pasa.
  if (new.raw_app_meta_data->>'invited_at') is not null then
    return new;
  end if;

  v_restaurant_id := (new.raw_user_meta_data->>'restaurant_id')::uuid;

  if v_restaurant_id is null or not exists (
    select 1 from public.restaurants where id = v_restaurant_id
  ) then
    raise exception
      'Registro no autorizado: crea tu restaurante antes de registrarte.'
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_signup_check' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_signup_check
      before insert on auth.users
      for each row execute function public.check_signup_allowed();
  end if;
end
$$;

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000014_grant_my_restaurant_id.sql
-- ────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- Otorgar EXECUTE de my_restaurant_id() al rol authenticated.
--
-- La migración multi-tenant revocó EXECUTE de todos los roles pero las
-- policies RLS de profiles, orders, tables, etc. invocan esta función cuando
-- el usuario autenticado hace queries. Sin EXECUTE Postgres devuelve
-- "permission denied for function my_restaurant_id" y todas las lecturas
-- del panel (profiles, work_schedules, etc.) fallan con 401.
--
-- anon NO necesita ejecutarla (usa filtros explícitos por restaurant_id).
-- ============================================================================
grant execute on function public.my_restaurant_id() to authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000015_fix_categories_multitenancy_unique.sql
-- ────────────────────────────────────────────────────────────────────────
-- Multi-tenancy: `categories.name` seguía con UNIQUE global heredado de la
-- migración inicial (`categories_name_key`) y bloqueaba que dos restaurantes
-- tuvieran categorías con el mismo nombre — descubierto por la prueba E2E al
-- crear un tenant nuevo con la categoría "Principales" que ya existía en otro.
--
-- También hacemos preventivo el UNIQUE(restaurant_id, number) en `tables`
-- para evitar mesas duplicadas dentro de un mismo tenant.

-- categories: UNIQUE global → UNIQUE per-tenant
alter table public.categories drop constraint if exists categories_name_key;
alter table public.categories
  add constraint categories_restaurant_name_unique unique (restaurant_id, name);

-- tables: nº de mesa único dentro del tenant
alter table public.tables drop constraint if exists tables_restaurant_number_unique;
alter table public.tables
  add constraint tables_restaurant_number_unique unique (restaurant_id, number);

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000016_fix_waiter_calls_anon_insert.sql
-- ────────────────────────────────────────────────────────────────────────
-- La policy "anon crea llamadas" está bloqueando el INSERT del cliente aunque
-- restaurant/mesa existan. La versión de la migración 9 tenía tautología en
-- el subquery; la 12 debía arreglarlo pero al parecer no se aplicó del todo
-- en el DB remoto — reprodujo 42501 en la prueba E2E aun con la mesa creada.
--
-- Aquí forzamos el estado correcto: dropeamos cualquier variante previa y
-- creamos la policy de una sola vez. Idempotente.

drop policy if exists "cliente llama al mesero" on public.waiter_calls;
drop policy if exists "anon crea llamadas"       on public.waiter_calls;

create policy "anon crea llamadas" on public.waiter_calls
  for insert to anon
  with check (
    exists (select 1 from public.restaurants r where r.id = waiter_calls.restaurant_id)
    and exists (
      select 1 from public.tables t
      where t.restaurant_id = waiter_calls.restaurant_id
        and t.number       = waiter_calls.table_number
    )
  );

-- Mismo blindaje para el INSERT anónimo de pedidos QR — por si la versión
-- vigente en el DB también es la antigua tautológica.
drop policy if exists "cliente crea pedido qr" on public.orders;
drop policy if exists "anon crea pedidos qr"   on public.orders;

create policy "anon crea pedidos qr" on public.orders
  for insert to anon
  with check (
    source = 'qr'
    and exists (select 1 from public.restaurants r where r.id = orders.restaurant_id)
    and exists (
      select 1 from public.tables t
      where t.restaurant_id = orders.restaurant_id
        and t.number       = orders.table_number
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000017_add_anon_read_waiter_calls.sql
-- ────────────────────────────────────────────────────────────────────────
-- Root cause del 42501 al llamar al mesero (bug detectado en la prueba E2E
-- cruzada): la migración 12 dropeó "todos leen llamadas" sin dejar reemplazo
-- para el rol anon. Cuando el cliente inserta con `.select().single()` en
-- supabase-js, PostgREST envía `Prefer: return=representation` y hace un
-- INSERT + SELECT. Al no haber policy de SELECT para anon, el SELECT falla y
-- PostgREST devuelve el mismo código 42501 aunque el INSERT sea válido.
--
-- Añadimos una policy mínima: anon puede leer llamadas de tenants existentes.
-- No es sensible (son solo pings del móvil del cliente al mesero) y equivale
-- al `for select using (true)` previo, pero con sanidad multi-tenant.

drop policy if exists "anon lee sus llamadas"   on public.waiter_calls;
drop policy if exists "anon lee llamadas"       on public.waiter_calls;

create policy "anon lee llamadas" on public.waiter_calls
  for select to anon
  using (
    exists (select 1 from public.restaurants r where r.id = waiter_calls.restaurant_id)
  );

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000018_fix_payment_methods_unique.sql
-- ────────────────────────────────────────────────────────────────────────
-- Mismo patrón que categorias: `payment_methods.name` seguía con UNIQUE global
-- heredado de la migración 5. Dos tenants no podían tener "Efectivo" a la vez,
-- lo cual bloquea el arranque del rol Cajero al crear un tenant nuevo.

alter table public.payment_methods drop constraint if exists payment_methods_name_key;
alter table public.payment_methods
  add constraint payment_methods_restaurant_name_unique unique (restaurant_id, name);

-- ────────────────────────────────────────────────────────────────────────
-- Migración: 20260708000019_create_restaurant_seed.sql
-- ────────────────────────────────────────────────────────────────────────
-- Descubierto en la prueba E2E: un tenant recién creado por `create_restaurant()`
-- estaba totalmente vacío — sin categorías, productos, mesas ni métodos de pago —
-- lo que dejaba al cliente con la home sin menú y al cajero sin poder cobrar.
--
-- Reescribimos la función para que además del `restaurants` + `restaurant_settings`
-- inicial también siembre:
--   · 4 categorías (Entradas, Principales, Postres, Bebidas)
--   · 6 productos de ejemplo con precios en la moneda por defecto
--   · 4 mesas colocadas en cuadrícula 2×2
--   · 3 métodos de pago (Efectivo, Tarjeta, Transferencia)
--
-- Al ejecutarse con SECURITY DEFINER, evita cualquier fricción con RLS. La
-- función sigue siendo idempotente en lo relativo a UNIQUE(slug); si al usuario
-- no le gusta el catálogo por defecto, lo edita desde el panel.

create or replace function public.create_restaurant(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_slug          text;
  v_cat_entradas    bigint;
  v_cat_principales bigint;
  v_cat_postres     bigint;
  v_cat_bebidas     bigint;
begin
  v_slug := trim(both '-' from regexp_replace(lower(trim(p_slug)), '[^a-z0-9]+', '-', 'g'));
  if length(v_slug) < 2 then
    raise exception 'El slug debe tener al menos 2 caracteres.';
  end if;

  insert into public.restaurants (name, slug)
  values (trim(p_name), v_slug)
  returning id into v_restaurant_id;

  -- Ajustes por defecto
  insert into public.restaurant_settings (restaurant_id, name)
  values (v_restaurant_id, trim(p_name));

  -- Categorías iniciales
  insert into public.categories (name, position, restaurant_id) values
    ('Entradas',    1, v_restaurant_id) returning id into v_cat_entradas;
  insert into public.categories (name, position, restaurant_id) values
    ('Principales', 2, v_restaurant_id) returning id into v_cat_principales;
  insert into public.categories (name, position, restaurant_id) values
    ('Postres',     3, v_restaurant_id) returning id into v_cat_postres;
  insert into public.categories (name, position, restaurant_id) values
    ('Bebidas',     4, v_restaurant_id) returning id into v_cat_bebidas;

  -- Productos de ejemplo (el admin los edita/reemplaza a su gusto)
  insert into public.products (name, description, price, available, category_id, restaurant_id) values
    ('Ensalada de la casa',    'Mezcla de hojas frescas con vinagreta',  8.50, true, v_cat_entradas,    v_restaurant_id),
    ('Sopa del día',           'Preparación diaria del chef',            6.00, true, v_cat_entradas,    v_restaurant_id),
    ('Pasta al pesto',         'Fettuccine con salsa de albahaca',      12.50, true, v_cat_principales, v_restaurant_id),
    ('Pollo a la parrilla',    'Con guarnición de verduras',            14.00, true, v_cat_principales, v_restaurant_id),
    ('Tarta de manzana',       'Casera, servida tibia',                  5.50, true, v_cat_postres,     v_restaurant_id),
    ('Agua mineral',           'Botella de 500 ml',                      2.50, true, v_cat_bebidas,     v_restaurant_id);

  -- Mesas iniciales (cuadrícula 2×2)
  insert into public.tables (number, x, y, seats, shape, status, restaurant_id) values
    (1, 100, 100, 4, 'sq', 'libre', v_restaurant_id),
    (2, 260, 100, 4, 'sq', 'libre', v_restaurant_id),
    (3, 100, 240, 4, 'sq', 'libre', v_restaurant_id),
    (4, 260, 240, 4, 'sq', 'libre', v_restaurant_id);

  -- Métodos de pago por defecto
  insert into public.payment_methods (name, position, active, restaurant_id) values
    ('Efectivo',      1, true, v_restaurant_id),
    ('Tarjeta',       2, true, v_restaurant_id),
    ('Transferencia', 3, true, v_restaurant_id);

  return v_restaurant_id;
end;
$$;

grant execute on function public.create_restaurant(text, text) to anon, authenticated;
