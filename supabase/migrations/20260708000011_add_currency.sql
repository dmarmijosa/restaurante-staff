-- Añade el símbolo de moneda configurable por el admin.
-- El valor por defecto '$' mantiene compatibilidad con datos existentes.
alter table public.restaurant_settings
  add column if not exists currency text not null default '$';
