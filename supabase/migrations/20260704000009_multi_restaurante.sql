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
create policy "admin gestiona su restaurante" on public.restaurants
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and restaurant_id = restaurants.id)
  );

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
