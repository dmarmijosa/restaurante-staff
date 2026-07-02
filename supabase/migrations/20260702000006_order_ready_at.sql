-- Momento en que la cocina marca el pedido como "listo". Sirve para medir el
-- tiempo de preparación (created_at → ready_at) en el Resumen del admin.
alter table public.orders add column if not exists ready_at timestamptz;
