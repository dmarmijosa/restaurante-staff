-- Multi-tenancy: `categories.name` seguía con UNIQUE global heredado de la
-- migración inicial (`categories_name_key`) y bloqueaba que dos restaurantes
-- tuvieran categorías con el mismo nombre — descubierto por la prueba E2E al
-- crear un tenant nuevo con la categoría "Principales" que ya existía en otro.
--
-- También hacemos preventivo el UNIQUE(restaurant_id, number) en `tables`
-- para evitar mesas duplicadas dentro de un mismo tenant.

-- categories: UNIQUE global → UNIQUE per-tenant
alter table public.categories drop constraint if exists categories_name_key;
alter table public.categories
  add constraint categories_restaurant_name_unique unique (restaurant_id, name);

-- tables: nº de mesa único dentro del tenant
alter table public.tables drop constraint if exists tables_restaurant_number_unique;
alter table public.tables
  add constraint tables_restaurant_number_unique unique (restaurant_id, number);
