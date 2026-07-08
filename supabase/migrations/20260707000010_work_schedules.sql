-- ============================================================================
-- Horario de trabajo semanal por empleado (módulo "Horario de trabajo").
-- Un registro por trabajador con 7 días (lunes→domingo) en JSONB.
-- ============================================================================
create table if not exists public.work_schedules (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  days jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (staff_id)
);

alter table public.work_schedules enable row level security;

create policy "staff lee horarios" on public.work_schedules
  for select using (public.is_staff() and restaurant_id = public.my_restaurant_id());
create policy "admin gestiona horarios" on public.work_schedules
  for all using (public.is_admin() and restaurant_id = public.my_restaurant_id())
  with check (public.is_admin() and restaurant_id = public.my_restaurant_id());
