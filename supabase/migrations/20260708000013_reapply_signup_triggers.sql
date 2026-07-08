-- ============================================================================
-- Re-aplicar los triggers de Auth con la versión multi-tenant.
--
-- En proyectos ya desplegados que llegaron a la versión multi-tenant a través
-- de aplicaciones parciales, el trigger `handle_new_user` puede seguir siendo
-- la versión "pre multi-restaurante" (que no rellena `restaurant_id`). Como
-- `profiles.restaurant_id` es NOT NULL, cualquier signUp acaba en el genérico
-- "Database error saving new user" (HTTP 500 de GoTrue).
--
-- Esta migración fuerza la versión definitiva de ambos triggers y garantiza
-- que los disparadores en `auth.users` existan.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_is_first      boolean;
begin
  v_restaurant_id := (new.raw_user_meta_data->>'restaurant_id')::uuid;

  if v_restaurant_id is null then
    raise exception 'Falta restaurant_id en el registro. Crea tu restaurante primero.';
  end if;

  select not exists (
    select 1 from public.profiles where restaurant_id = v_restaurant_id
  ) into v_is_first;

  insert into public.profiles (id, full_name, email, role, is_owner, restaurant_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when v_is_first then 'admin' else coalesce(new.raw_user_meta_data->>'role', 'mesero') end,
    v_is_first,
    v_restaurant_id
  );
  return new;
end;
$$;

create or replace function public.check_signup_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  -- Invitaciones desde el dashboard de Supabase → siempre pasa.
  if (new.raw_app_meta_data->>'invited_at') is not null then
    return new;
  end if;

  v_restaurant_id := (new.raw_user_meta_data->>'restaurant_id')::uuid;

  if v_restaurant_id is null or not exists (
    select 1 from public.restaurants where id = v_restaurant_id
  ) then
    raise exception
      'Registro no autorizado: crea tu restaurante antes de registrarte.'
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_signup_check' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_signup_check
      before insert on auth.users
      for each row execute function public.check_signup_allowed();
  end if;
end
$$;
