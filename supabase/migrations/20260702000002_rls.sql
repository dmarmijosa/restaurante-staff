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
