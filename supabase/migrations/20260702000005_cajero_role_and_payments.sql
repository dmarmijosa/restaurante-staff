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
