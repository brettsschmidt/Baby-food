-- v7 schema additions

-- Households: timezone + display density
alter table public.households
  add column if not exists timezone text default 'UTC',
  add column if not exists list_density text check (list_density in ('comfortable','compact')) default 'comfortable';

-- Sticky notes: snooze
alter table public.sticky_notes
  add column if not exists snoozed_until timestamptz;

-- Recipes: equipment list, parent recipe (variants)
alter table public.recipes
  add column if not exists equipment text,
  add column if not exists parent_recipe_id uuid references public.recipes(id) on delete set null;

-- Foods/inventory: starred favorites
alter table public.foods
  add column if not exists starred boolean not null default false;
alter table public.inventory_items
  add column if not exists starred boolean not null default false;

-- Comments: read receipts
alter table public.feeding_comments
  add column if not exists read_by uuid[] not null default '{}';

-- Trend annotations
create table if not exists public.trend_annotations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid references public.babies(id) on delete cascade,
  occurred_on date not null default current_date,
  label text not null,
  kind text check (kind in ('vacation','sick','growth_spurt','teething','other')) default 'other',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists trend_annotations_baby_idx
  on public.trend_annotations(baby_id, occurred_on desc);

-- Recently-viewed (per-user)
create table if not exists public.recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  entity_type text not null check (entity_type in ('inventory_item','recipe','memory','feeding')),
  entity_id uuid not null,
  viewed_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists recently_viewed_user_idx
  on public.recently_viewed(user_id, viewed_at desc);

-- Page-load + slow-query timing logs (lightweight)
create table if not exists public.timing_logs (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  household_id uuid references public.households(id) on delete set null,
  route text not null,
  duration_ms int not null,
  created_at timestamptz not null default now()
);

create index if not exists timing_logs_created_idx on public.timing_logs(created_at desc);
create index if not exists timing_logs_route_idx on public.timing_logs(route);

-- Daily date notes (per-baby)
create table if not exists public.day_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid references public.babies(id) on delete cascade,
  on_date date not null default current_date,
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, baby_id, on_date)
);

create trigger day_notes_set_updated_at before update on public.day_notes
  for each row execute function public.set_updated_at();

-- Dashboard widget order (per user)
create table if not exists public.dashboard_layout (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  widgets text[] not null default '{quick_log,sticky,streak,memory,goals,last,expiring,plan}',
  updated_at timestamptz not null default now()
);

create trigger dashboard_layout_set_updated_at before update on public.dashboard_layout
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RLS for new tables
-- =====================================================================

alter table public.trend_annotations enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.timing_logs enable row level security;
alter table public.day_notes enable row level security;
alter table public.dashboard_layout enable row level security;

create policy "trend_annotations: members" on public.trend_annotations
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "recently_viewed: self" on public.recently_viewed
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "day_notes: members" on public.day_notes
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "dashboard_layout: self" on public.dashboard_layout
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- timing_logs: only the service role + admin reads it.
create policy "timing_logs: insert authed" on public.timing_logs
  for insert with check (auth.uid() is not null);

-- Realtime
alter publication supabase_realtime add table public.trend_annotations;
alter publication supabase_realtime add table public.day_notes;

-- Helper: track a recently-viewed entity (security definer to dedupe quickly)
create or replace function public.track_view(
  p_household_id uuid, p_entity_type text, p_entity_id uuid
) returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.recently_viewed (user_id, household_id, entity_type, entity_id, viewed_at)
  values (auth.uid(), p_household_id, p_entity_type, p_entity_id, now())
  on conflict (user_id, entity_type, entity_id) do update set viewed_at = excluded.viewed_at;

  -- Trim to most recent 50 per user.
  delete from public.recently_viewed
  where user_id = auth.uid()
    and id not in (
      select id from public.recently_viewed
      where user_id = auth.uid()
      order by viewed_at desc
      limit 50
    );
end;
$$;

grant execute on function public.track_view(uuid, text, uuid) to authenticated;

-- Restore-from-archive helpers (within 30 days)
create or replace function public.restore_feeding(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.feedings set archived_at = null
   where id = p_id
     and archived_at is not null
     and archived_at >= now() - interval '30 days'
     and public.is_household_member(household_id);
end;
$$;

create or replace function public.restore_inventory_item(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.inventory_items set archived_at = null
   where id = p_id
     and archived_at is not null
     and archived_at >= now() - interval '30 days'
     and public.is_household_member(household_id);
end;
$$;

grant execute on function public.restore_feeding(uuid) to authenticated;
grant execute on function public.restore_inventory_item(uuid) to authenticated;
