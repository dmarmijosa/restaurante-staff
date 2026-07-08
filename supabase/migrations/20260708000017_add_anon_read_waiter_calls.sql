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
