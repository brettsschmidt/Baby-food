-- v3 schema additions: allergen profiles, growth/sleep/diaper logs,
-- theming, milestones, shared foods, digest opt-ins, audit retention.

-- =====================================================================
-- babies: per-baby allergens + photo
-- =====================================================================

alter table public.babies
  add column if not exists known_allergens text[] not null default '{}',
  add column if not exists photo_path text;

-- =====================================================================
-- households: theming + audit retention
-- =====================================================================

alter table public.households
  add column if not exists theme_color text default '#3f9d4a',
  add column if not exists accent_emoji text default '🥕',
  add column if not exists activity_retention_days int default 365,
  add column if not exists shared_foods_opt_in boolean default false;

-- =====================================================================
-- household_member_prefs: weekly digest opt-in
-- =====================================================================

alter table public.household_member_prefs
  add column if not exists notify_weekly_digest boolean not null default false,
  add column if not exists digest_send_dow int default 0,           -- 0 = Sunday
  add column if not exists digest_send_hour int default 9;

-- =====================================================================
-- growth_measurements
-- =====================================================================

create table if not exists public.growth_measurements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric,
  length_cm numeric,
  head_cm numeric,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists growth_baby_date_idx
  on public.growth_measurements(baby_id, measured_on desc);

-- =====================================================================
-- sleep_logs
-- =====================================================================

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  kind text check (kind in ('night','nap')) default 'nap',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists sleep_baby_started_idx
  on public.sleep_logs(baby_id, started_at desc);

-- =====================================================================
-- diaper_logs
-- =====================================================================

create table if not exists public.diaper_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  changed_at timestamptz not null default now(),
  kind text not null check (kind in ('wet','dirty','both','dry')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists diaper_baby_changed_idx
  on public.diaper_logs(baby_id, changed_at desc);

-- =====================================================================
-- milestones (one row per achievement, one-shot)
-- =====================================================================

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid references public.babies(id) on delete cascade,
  kind text not null,
  achieved_at timestamptz not null default now(),
  detail text,
  created_at timestamptz not null default now(),
  unique (household_id, baby_id, kind)
);

create index if not exists milestones_household_idx
  on public.milestones(household_id, achieved_at desc);

-- =====================================================================
-- shared_foods (opt-in catalog of anonymized foods)
-- =====================================================================

create table if not exists public.shared_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  min_age_months int,
  allergens text[] not null default '{}',
  texture text check (texture in ('puree','mash','soft','finger')),
  intro_count int not null default 0,
  loved_share numeric,                                  -- 0..1
  source_household_id uuid references public.households(id) on delete set null,
  contributed_at timestamptz not null default now()
);

create unique index if not exists shared_foods_name_age_unique_idx on public.shared_foods(lower(name), min_age_months);
create index if not exists shared_foods_age_idx on public.shared_foods(min_age_months);

-- shared_foods is world-readable to authenticated users (no household scope).
alter table public.shared_foods enable row level security;
create policy "shared_foods: read all authed" on public.shared_foods
  for select using (auth.role() = 'authenticated');
-- Inserts only via the share_food RPC below, which scopes via security definer.

-- =====================================================================
-- RLS for new household-scoped tables
-- =====================================================================

alter table public.growth_measurements enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.diaper_logs enable row level security;
alter table public.milestones enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'growth_measurements', 'sleep_logs', 'diaper_logs', 'milestones'
  ])
  loop
    execute format($f$
      drop policy if exists "%1$s: members read" on public.%1$I;
      create policy "%1$s: members read" on public.%1$I
        for select using (public.is_household_member(household_id));
      drop policy if exists "%1$s: members write" on public.%1$I;
      create policy "%1$s: members write" on public.%1$I
        for insert with check (public.is_household_member(household_id));
      drop policy if exists "%1$s: members update" on public.%1$I;
      create policy "%1$s: members update" on public.%1$I
        for update using (public.is_household_member(household_id))
        with check (public.is_household_member(household_id));
      drop policy if exists "%1$s: members delete" on public.%1$I;
      create policy "%1$s: members delete" on public.%1$I
        for delete using (public.is_household_member(household_id));
    $f$, t);
  end loop;
end $$;

-- =====================================================================
-- share_food RPC (anonymized contribution to shared_foods)
-- =====================================================================

create or replace function public.contribute_shared_food(
  p_name text, p_category text, p_min_age_months int,
  p_allergens text[], p_texture text
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_household uuid;
  v_id uuid;
begin
  -- Only members of an opted-in household can contribute.
  select hm.household_id into v_household
  from public.household_members hm
  join public.households h on h.id = hm.household_id
  where hm.user_id = auth.uid() and h.shared_foods_opt_in = true
  limit 1;

  if v_household is null then
    raise exception 'household has not opted in to shared foods';
  end if;

  insert into public.shared_foods (name, category, min_age_months, allergens, texture, source_household_id, intro_count)
  values (p_name, p_category, p_min_age_months, coalesce(p_allergens, '{}'), p_texture, v_household, 1)
  on conflict (lower(name), min_age_months)
    do update set intro_count = public.shared_foods.intro_count + 1
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.contribute_shared_food(text, text, int, text[], text) to authenticated;

-- =====================================================================
-- prune_activity_log helper (called by a cron or by app code)
-- =====================================================================

create or replace function public.prune_activity_log(p_household_id uuid)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_days int;
  v_deleted int;
begin
  select activity_retention_days into v_days
  from public.households where id = p_household_id;

  if v_days is null then return 0; end if;

  with deleted as (
    delete from public.activity_log
    where household_id = p_household_id
      and created_at < now() - make_interval(days => v_days)
    returning 1
  )
  select count(*) into v_deleted from deleted;
  return v_deleted;
end;
$$;

grant execute on function public.prune_activity_log(uuid) to authenticated;

-- =====================================================================
-- delete_account RPC (full self-erase)
-- =====================================================================

create or replace function public.delete_account()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owned uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- For each household the user owns, delete it (cascades to all data).
  for v_owned in
    select household_id from public.household_members
    where user_id = v_uid and role = 'owner'
  loop
    -- If they're the only member, drop the household.
    if (select count(*) from public.household_members where household_id = v_owned) = 1 then
      delete from public.households where id = v_owned;
    end if;
  end loop;

  -- Remove memberships for any households we didn't drop above.
  delete from public.household_members where user_id = v_uid;

  -- Delete profile (auth.users will need to be deleted by a separate
  -- admin call from the server action — RLS on auth schema is restrictive).
  delete from public.profiles where id = v_uid;
end;
$$;

grant execute on function public.delete_account() to authenticated;

-- =====================================================================
-- Realtime additions
-- =====================================================================

alter publication supabase_realtime add table public.growth_measurements;
alter publication supabase_realtime add table public.sleep_logs;
alter publication supabase_realtime add table public.diaper_logs;
alter publication supabase_realtime add table public.milestones;
