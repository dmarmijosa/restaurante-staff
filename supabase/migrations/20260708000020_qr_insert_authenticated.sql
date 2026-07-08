-- ============================================================================
-- Cliente QR con sesión de staff abierta (admin probando el menú, etc.)
--
-- Las policies de INSERT en waiter_calls y orders solo existían para `anon`.
-- Si el navegador tiene JWT de staff, PostgREST usa rol `authenticated` y el
-- INSERT falla con 42501 aunque restaurante y mesa sean válidos.
-- ============================================================================

drop policy if exists "autenticado crea llamadas" on public.waiter_calls;
create policy "autenticado crea llamadas" on public.waiter_calls
  for insert to authenticated
  with check (
    exists (select 1 from public.restaurants r where r.id = waiter_calls.restaurant_id)
    and exists (
      select 1 from public.tables t
      where t.restaurant_id = waiter_calls.restaurant_id
        and t.number = waiter_calls.table_number
    )
  );

drop policy if exists "autenticado crea pedidos qr" on public.orders;
create policy "autenticado crea pedidos qr" on public.orders
  for insert to authenticated
  with check (
    source = 'qr'
    and exists (select 1 from public.restaurants r where r.id = orders.restaurant_id)
    and exists (
      select 1 from public.tables t
      where t.restaurant_id = orders.restaurant_id
        and t.number = orders.table_number
    )
  );
