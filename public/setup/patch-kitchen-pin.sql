-- Parche: cocina protegida por PIN (migración 23).
-- Ejecutar en el SQL Editor si la base ya tiene el esquema anterior.

alter table public.restaurant_settings
  add column if not exists kitchen_pin_set boolean not null default false;

create or replace function public.kitchen_account_email(p_restaurant_id uuid)
returns text
language sql
immutable
as $$
  select 'kitchen+' || p_restaurant_id::text || '@restaurantestaff.internal';
$$;

create or replace function public.ensure_kitchen_account(p_restaurant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_email   text;
  v_user_id uuid;
  v_instance uuid;
begin
  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'Restaurante no encontrado' using errcode = 'P0002';
  end if;

  v_email := public.kitchen_account_email(p_restaurant_id);

  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is not null then
    return v_user_id;
  end if;

  select id into v_instance from auth.instances limit 1;
  if v_instance is null then
    v_instance := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  ) values (
    v_instance,
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'restaurant_id', p_restaurant_id::text,
      'full_name', 'Tablet cocina',
      'role', 'cocina'
    ),
    false,
    now(),
    now()
  );

  return v_user_id;
end;
$$;

create or replace function public.admin_set_kitchen_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id         uuid := auth.uid();
  v_caller_restaurant uuid;
  v_caller_role       text;
  v_user_id           uuid;
begin
  if v_caller_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_pin is null or p_pin !~ '^\d{6}$' then
    raise exception 'El PIN debe tener exactamente 6 dígitos' using errcode = '22023';
  end if;

  select restaurant_id, role::text
    into v_caller_restaurant, v_caller_role
  from public.profiles
  where id = v_caller_id;

  if v_caller_role <> 'admin' then
    raise exception 'Solo un administrador puede configurar el PIN de cocina' using errcode = '42501';
  end if;

  v_user_id := public.ensure_kitchen_account(v_caller_restaurant);

  update auth.users
  set
    encrypted_password = extensions.crypt(p_pin, extensions.gen_salt('bf')),
    updated_at = now()
  where id = v_user_id;

  update public.restaurant_settings
  set kitchen_pin_set = true, updated_at = now()
  where restaurant_id = v_caller_restaurant;
end;
$$;

grant execute on function public.kitchen_account_email(uuid) to anon, authenticated;
grant execute on function public.ensure_kitchen_account(uuid) to authenticated;
grant execute on function public.admin_set_kitchen_pin(text) to authenticated;

do $$
declare
  r record;
begin
  for r in select id from public.restaurants loop
    perform public.ensure_kitchen_account(r.id);
  end loop;
end;
$$;

drop policy if exists "anon avanza pedidos cocina" on public.orders;

notify pgrst, 'reload schema';
