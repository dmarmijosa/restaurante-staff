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
