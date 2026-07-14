-- Añade el símbolo de moneda configurable por el admin.
-- El valor por defecto '€' aplica a nuevos ajustes; los existentes conservan su símbolo.
alter table public.restaurant_settings
  add column if not exists currency text not null default '€';
