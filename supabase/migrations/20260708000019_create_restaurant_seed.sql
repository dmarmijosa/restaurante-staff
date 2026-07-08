-- Descubierto en la prueba E2E: un tenant recién creado por `create_restaurant()`
-- estaba totalmente vacío — sin categorías, productos, mesas ni métodos de pago —
-- lo que dejaba al cliente con la home sin menú y al cajero sin poder cobrar.
--
-- Reescribimos la función para que además del `restaurants` + `restaurant_settings`
-- inicial también siembre:
--   · 4 categorías (Entradas, Principales, Postres, Bebidas)
--   · 6 productos de ejemplo con precios en la moneda por defecto
--   · 4 mesas colocadas en cuadrícula 2×2
--   · 3 métodos de pago (Efectivo, Tarjeta, Transferencia)
--
-- Al ejecutarse con SECURITY DEFINER, evita cualquier fricción con RLS. La
-- función sigue siendo idempotente en lo relativo a UNIQUE(slug); si al usuario
-- no le gusta el catálogo por defecto, lo edita desde el panel.

create or replace function public.create_restaurant(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_slug          text;
  v_cat_entradas    bigint;
  v_cat_principales bigint;
  v_cat_postres     bigint;
  v_cat_bebidas     bigint;
begin
  v_slug := trim(both '-' from regexp_replace(lower(trim(p_slug)), '[^a-z0-9]+', '-', 'g'));
  if length(v_slug) < 2 then
    raise exception 'El slug debe tener al menos 2 caracteres.';
  end if;

  insert into public.restaurants (name, slug)
  values (trim(p_name), v_slug)
  returning id into v_restaurant_id;

  -- Ajustes por defecto
  insert into public.restaurant_settings (restaurant_id, name)
  values (v_restaurant_id, trim(p_name));

  -- Categorías iniciales
  insert into public.categories (name, position, restaurant_id) values
    ('Entradas',    1, v_restaurant_id) returning id into v_cat_entradas;
  insert into public.categories (name, position, restaurant_id) values
    ('Principales', 2, v_restaurant_id) returning id into v_cat_principales;
  insert into public.categories (name, position, restaurant_id) values
    ('Postres',     3, v_restaurant_id) returning id into v_cat_postres;
  insert into public.categories (name, position, restaurant_id) values
    ('Bebidas',     4, v_restaurant_id) returning id into v_cat_bebidas;

  -- Productos de ejemplo (el admin los edita/reemplaza a su gusto)
  insert into public.products (name, description, price, available, category_id, restaurant_id) values
    ('Ensalada de la casa',    'Mezcla de hojas frescas con vinagreta',  8.50, true, v_cat_entradas,    v_restaurant_id),
    ('Sopa del día',           'Preparación diaria del chef',            6.00, true, v_cat_entradas,    v_restaurant_id),
    ('Pasta al pesto',         'Fettuccine con salsa de albahaca',      12.50, true, v_cat_principales, v_restaurant_id),
    ('Pollo a la parrilla',    'Con guarnición de verduras',            14.00, true, v_cat_principales, v_restaurant_id),
    ('Tarta de manzana',       'Casera, servida tibia',                  5.50, true, v_cat_postres,     v_restaurant_id),
    ('Agua mineral',           'Botella de 500 ml',                      2.50, true, v_cat_bebidas,     v_restaurant_id);

  -- Mesas iniciales (cuadrícula 2×2)
  insert into public.tables (number, x, y, seats, shape, status, restaurant_id) values
    (1, 100, 100, 4, 'sq', 'libre', v_restaurant_id),
    (2, 260, 100, 4, 'sq', 'libre', v_restaurant_id),
    (3, 100, 240, 4, 'sq', 'libre', v_restaurant_id),
    (4, 260, 240, 4, 'sq', 'libre', v_restaurant_id);

  -- Métodos de pago por defecto
  insert into public.payment_methods (name, position, active, restaurant_id) values
    ('Efectivo',      1, true, v_restaurant_id),
    ('Tarjeta',       2, true, v_restaurant_id),
    ('Transferencia', 3, true, v_restaurant_id);

  return v_restaurant_id;
end;
$$;

grant execute on function public.create_restaurant(text, text) to anon, authenticated;
