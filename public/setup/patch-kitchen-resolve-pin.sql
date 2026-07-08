-- Parche: resolver restaurante correcto para cocina y validar PIN en servidor.

create or replace function public.resolve_kitchen_restaurant(p_slug text default null)
returns table (id uuid, name text, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pinned_count integer;
begin
  if p_slug is not null and length(trim(p_slug)) > 0 then
    return query
    select r.id, r.name, r.slug
    from public.restaurants r
    where r.slug = trim(p_slug)
    limit 1;
    return;
  end if;

  select count(distinct rs.restaurant_id)
    into v_pinned_count
  from public.restaurant_settings rs
  where rs.kitchen_pin_set = true;

  if v_pinned_count = 1 then
    return query
    select r.id, r.name, r.slug
    from public.restaurant_settings rs
    join public.restaurants r on r.id = rs.restaurant_id
    where rs.kitchen_pin_set = true
    limit 1;
    return;
  end if;

  return query
  select r.id, r.name, r.slug
  from public.restaurants r
  order by r.created_at asc
  limit 1;
end;
$$;

create or replace function public.kitchen_pin_is_valid(p_restaurant_id uuid, p_pin text)
returns boolean
language sql
security definer
set search_path = public, extensions, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.email = public.kitchen_account_email(p_restaurant_id)
      and u.encrypted_password = extensions.crypt(p_pin, u.encrypted_password)
  );
$$;

grant execute on function public.resolve_kitchen_restaurant(text) to anon, authenticated;
grant execute on function public.kitchen_pin_is_valid(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
