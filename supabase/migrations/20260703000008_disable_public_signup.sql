-- ============================================================================
-- Cierre del registro público tras el bootstrap del administrador
-- ============================================================================
-- Motivo (ADR relacionado): el primer usuario que llega a /registro-inicial
-- se convierte en admin propietario. A partir de ese momento nadie más puede
-- registrarse en la app por su cuenta: el acceso del equipo lo gestiona el
-- admin desde el panel de Supabase (Authentication → Users → Invite user).
-- Las invitaciones del dashboard tienen 'invited_at' en raw_app_meta_data,
-- lo que permite distinguirlas de los registros públicos directos.
-- ============================================================================

-- ── Función de control de acceso al registro ─────────────────────────────────
create or replace function public.check_signup_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Siempre permitir mientras no exista un administrador propietario
  -- (necesario para el bootstrap inicial del restaurante).
  if not exists (select 1 from public.profiles where is_owner = true) then
    return new;
  end if;

  -- Invitaciones enviadas desde el panel de Supabase (Authentication → Invite):
  -- tienen 'invited_at' en raw_app_meta_data; se permiten para que el admin
  -- pueda dar acceso al equipo sin abrir el registro público.
  if (new.raw_app_meta_data->>'invited_at') is not null then
    return new;
  end if;

  raise exception
    'El registro público está desactivado. Pide al administrador del restaurante que te invite desde el panel de Supabase.'
    using errcode = 'P0002';
end;
$$;

-- ── Disparador previo al INSERT en auth.users ────────────────────────────────
-- Se ejecuta antes de cada registro de cuenta, tanto desde la app como desde
-- llamadas directas a la API. No afecta a actualizaciones ni borrados.
create trigger on_auth_signup_check
  before insert on auth.users
  for each row execute function public.check_signup_allowed();
