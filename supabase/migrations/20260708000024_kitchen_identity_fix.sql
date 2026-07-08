-- ============================================================================
-- Fix: cuenta cocina debe tener fila en auth.identities para poder hacer login.
-- ============================================================================

create or replace function public.ensure_kitchen_account(p_restaurant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_email    text;
  v_user_id  uuid;
  v_instance uuid;
begin
  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'Restaurante no encontrado' using errcode = 'P0002';
  end if;

  v_email := public.kitchen_account_email(p_restaurant_id);

  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is not null then
    -- Reparar cuentas creadas sin identity (login imposible).
    if not exists (select 1 from auth.identities where user_id = v_user_id and provider = 'email') then
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email),
        'email',
        v_user_id::text,
        now(),
        now(),
        now()
      );
    end if;
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

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  return v_user_id;
end;
$$;

-- Reparar cuentas cocina ya existentes sin identity.
do $$
declare
  r record;
begin
  for r in
    select u.id, u.email
    from auth.users u
    where u.email like 'kitchen+%@restaurantestaff.internal'
      and not exists (
        select 1 from auth.identities i
        where i.user_id = u.id and i.provider = 'email'
      )
  loop
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      r.id,
      r.id,
      jsonb_build_object('sub', r.id::text, 'email', r.email),
      'email',
      r.id::text,
      now(),
      now(),
      now()
    );
  end loop;
end;
$$;

-- Cuenta tenants reales (con admin), no filas huérfanas en restaurants.
create or replace function public.count_operational_restaurants()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct restaurant_id)::integer
  from public.profiles
  where role = 'admin';
$$;

grant execute on function public.count_operational_restaurants() to anon, authenticated;
grant execute on function public.ensure_kitchen_account(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
