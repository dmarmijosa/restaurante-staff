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
