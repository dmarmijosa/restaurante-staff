-- ============================================================================
-- El administrador puede fijar una contraseña nueva al personal sin depender
-- del enlace de recuperación por correo (que en local apunta a localhost:3000).
-- ============================================================================

create or replace function public.admin_set_staff_password(
  p_user_id uuid,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id         uuid := auth.uid();
  v_caller_restaurant uuid;
  v_caller_role       text;
  v_caller_is_owner   boolean;
  v_target_restaurant uuid;
  v_target_is_owner   boolean;
begin
  if v_caller_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_new_password is null or char_length(p_new_password) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres' using errcode = '22023';
  end if;

  select restaurant_id, role::text, is_owner
    into v_caller_restaurant, v_caller_role, v_caller_is_owner
  from public.profiles
  where id = v_caller_id;

  if v_caller_role <> 'admin' then
    raise exception 'Solo un administrador puede cambiar contraseñas del equipo' using errcode = '42501';
  end if;

  select restaurant_id, is_owner
    into v_target_restaurant, v_target_is_owner
  from public.profiles
  where id = p_user_id;

  if v_target_restaurant is null then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;

  if v_target_restaurant <> v_caller_restaurant then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_target_is_owner and not v_caller_is_owner and v_caller_id <> p_user_id then
    raise exception 'No puedes cambiar la contraseña del propietario' using errcode = '42501';
  end if;

  update auth.users
  set
    encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Cuenta de acceso no encontrada' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.admin_set_staff_password(uuid, text) to authenticated;

notify pgrst, 'reload schema';
