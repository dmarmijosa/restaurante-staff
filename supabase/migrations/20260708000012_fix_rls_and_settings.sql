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
