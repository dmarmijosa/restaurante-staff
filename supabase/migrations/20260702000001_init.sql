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
