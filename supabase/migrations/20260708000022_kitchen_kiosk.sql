-- ============================================================================
-- Cocina como pantalla abierta (sin login) y avance de comandas vía rol anon.
-- ============================================================================

drop policy if exists "anon avanza pedidos cocina" on public.orders;
create policy "anon avanza pedidos cocina" on public.orders
  for update to anon
  using (
    source = 'qr'
    and exists (select 1 from public.restaurants r where r.id = orders.restaurant_id)
    and status in ('recibido', 'preparando')
  )
  with check (
    source = 'qr'
    and status in ('preparando', 'listo')
    and exists (select 1 from public.restaurants r where r.id = orders.restaurant_id)
  );

notify pgrst, 'reload schema';
