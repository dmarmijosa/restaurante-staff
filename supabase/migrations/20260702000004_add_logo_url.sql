-- Logo del restaurante (URL en el bucket 'imagenes'); lo sube el admin desde
-- Ajustes y se muestra en el panel, la tablet del mesero y el menú del cliente.
alter table public.restaurant_settings add column if not exists logo_url text;
