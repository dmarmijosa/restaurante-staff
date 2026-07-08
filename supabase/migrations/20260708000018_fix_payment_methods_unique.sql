-- Mismo patrón que categorias: `payment_methods.name` seguía con UNIQUE global
-- heredado de la migración 5. Dos tenants no podían tener "Efectivo" a la vez,
-- lo cual bloquea el arranque del rol Cajero al crear un tenant nuevo.

alter table public.payment_methods drop constraint if exists payment_methods_name_key;
alter table public.payment_methods
  add constraint payment_methods_restaurant_name_unique unique (restaurant_id, name);
