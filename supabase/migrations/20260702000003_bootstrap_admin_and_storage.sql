-- ============================================================================
-- Bootstrap del primer administrador + bucket de imágenes
-- ============================================================================

-- ¿Existe ya algún administrador? Callable por anon: el formulario de registro
-- inicial la usa ANTES de autenticar para decidir si mostrarse.
create or replace function public.admin_exists()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where role = 'admin');
$$;
grant execute on function public.admin_exists() to anon, authenticated;

-- El PRIMER usuario que se registra se convierte en admin propietario; los
-- siguientes toman el rol de sus metadatos (o 'mesero'). Así el registro
-- inicial solo "funciona como admin" una vez.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, full_name, email, role, is_owner)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when is_first then 'admin' else coalesce(new.raw_user_meta_data ->> 'role', 'mesero') end,
    is_first
  );
  return new;
end;
$$;

-- ── Bucket público de imágenes (fotos de productos y logo) ──────────────────
insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;

-- Lectura pública (el menú del cliente muestra las fotos sin login).
create policy "imagenes lectura publica" on storage.objects
  for select using (bucket_id = 'imagenes');
-- Solo el admin sube/actualiza/borra imágenes.
create policy "imagenes admin inserta" on storage.objects
  for insert to authenticated with check (bucket_id = 'imagenes' and public.is_admin());
create policy "imagenes admin actualiza" on storage.objects
  for update to authenticated using (bucket_id = 'imagenes' and public.is_admin());
create policy "imagenes admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'imagenes' and public.is_admin());
