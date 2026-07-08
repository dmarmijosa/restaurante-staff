-- Parche: URLs de cocina en raíz si solo un restaurante tiene PIN (o un propietario).
create or replace function public.count_kitchen_url_tenants()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with pinned as (
    select count(distinct restaurant_id)::integer as n
    from public.restaurant_settings
    where kitchen_pin_set = true
  ),
  owners as (
    select count(distinct restaurant_id)::integer as n
    from public.profiles
    where role = 'admin' and is_owner = true
  )
  select greatest(
    coalesce(nullif((select n from pinned), 0), (select n from owners), 1),
    1
  );
$$;

grant execute on function public.count_kitchen_url_tenants() to anon, authenticated;

notify pgrst, 'reload schema';
