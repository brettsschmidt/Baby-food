-- v6 schema additions: ratings, substitutions, step photos, quiet hours,
-- caregiver schedule, per-baby theming, snapshots, saved filters, etc.

alter table public.inventory_items
  add column if not exists cost_cents int,
  add column if not exists reserved_at timestamptz,
  add column if not exists reserved_for date;

alter table public.households
  add column if not exists storage_capacity_freezer int,
  add column if not exists storage_capacity_fridge int,
  add column if not exists storage_capacity_pantry int;

alter table public.household_member_prefs
  add column if not exists quiet_hours_start int,
  add column if not exists quiet_hours_end int;

alter table public.babies
  add column if not exists theme_color text;

alter table public.shopping_list_items
  add column if not exists aisle text;

-- Per-feeding parent ratings (1..5 stars, one row per parent)
create table if not exists public.feeding_ratings (
  feeding_id uuid not null references public.feedings(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (feeding_id, rater_id)
);

-- Per-recipe star ratings
create table if not exists public.recipe_ratings (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  primary key (recipe_id, rater_id)
);

-- Recipe ingredient substitutions
create table if not exists public.recipe_substitutions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient text not null,
  substitution text not null,
  created_at timestamptz not null default now()
);

create index if not exists recipe_substitutions_recipe_idx
  on public.recipe_substitutions(recipe_id);

-- Recipe steps with optional photos
create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position int not null default 0,
  body text not null,
  photo_path text,
  created_at timestamptz not null default now()
);

create index if not exists recipe_steps_recipe_idx
  on public.recipe_steps(recipe_id, position);

-- Caregiver schedule (who's "on duty" today)
create table if not exists public.caregiver_shifts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists caregiver_shifts_household_starts_idx
  on public.caregiver_shifts(household_id, starts_at desc);

-- Reactions on activity feed entries
create table if not exists public.activity_reactions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activity_log(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (activity_id, user_id, emoji)
);

create index if not exists activity_reactions_activity_idx
  on public.activity_reactions(activity_id);

-- Monthly goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid references public.babies(id) on delete cascade,
  metric text not null check (metric in ('unique_foods','feedings','variety_score','self_feed_meals')),
  target int not null check (target > 0),
  period text not null check (period in ('week','month')) default 'month',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (household_id, baby_id, metric, period)
);

-- Saved filters (per-user, per-page)
create table if not exists public.saved_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  page text not null check (page in ('inventory','feedings','search')),
  name text not null,
  query text not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_filters_user_page_idx
  on public.saved_filters(user_id, page);

-- Daily inventory snapshots (computed by a cron or on-demand)
create table if not exists public.inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  taken_on date not null default current_date,
  total_items int not null,
  total_units numeric not null,
  total_value_cents int,
  unique (household_id, taken_on)
);

-- =====================================================================
-- RLS for new tables
-- =====================================================================

alter table public.feeding_ratings enable row level security;
alter table public.recipe_ratings enable row level security;
alter table public.recipe_substitutions enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.caregiver_shifts enable row level security;
alter table public.activity_reactions enable row level security;
alter table public.goals enable row level security;
alter table public.saved_filters enable row level security;
alter table public.inventory_snapshots enable row level security;

-- household-scoped tables
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'caregiver_shifts','goals','inventory_snapshots'
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

-- saved_filters: self only
create policy "saved_filters: self all" on public.saved_filters
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ratings: scope via parent
create policy "feeding_ratings: members" on public.feeding_ratings
  for all using (
    exists (select 1 from public.feedings f
      where f.id = feeding_ratings.feeding_id
        and public.is_household_member(f.household_id))
  ) with check (
    exists (select 1 from public.feedings f
      where f.id = feeding_ratings.feeding_id
        and public.is_household_member(f.household_id))
  );

create policy "recipe_ratings: members" on public.recipe_ratings
  for all using (
    exists (select 1 from public.recipes r
      where r.id = recipe_ratings.recipe_id
        and public.is_household_member(r.household_id))
  ) with check (
    exists (select 1 from public.recipes r
      where r.id = recipe_ratings.recipe_id
        and public.is_household_member(r.household_id))
  );

create policy "recipe_substitutions: members" on public.recipe_substitutions
  for all using (
    exists (select 1 from public.recipes r
      where r.id = recipe_substitutions.recipe_id
        and public.is_household_member(r.household_id))
  ) with check (
    exists (select 1 from public.recipes r
      where r.id = recipe_substitutions.recipe_id
        and public.is_household_member(r.household_id))
  );

create policy "recipe_steps: members" on public.recipe_steps
  for all using (
    exists (select 1 from public.recipes r
      where r.id = recipe_steps.recipe_id
        and public.is_household_member(r.household_id))
  ) with check (
    exists (select 1 from public.recipes r
      where r.id = recipe_steps.recipe_id
        and public.is_household_member(r.household_id))
  );

create policy "activity_reactions: members" on public.activity_reactions
  for all using (
    exists (select 1 from public.activity_log al
      where al.id = activity_reactions.activity_id
        and public.is_household_member(al.household_id))
  ) with check (
    exists (select 1 from public.activity_log al
      where al.id = activity_reactions.activity_id
        and public.is_household_member(al.household_id))
  );

-- Realtime
alter publication supabase_realtime add table public.feeding_ratings;
alter publication supabase_realtime add table public.activity_reactions;
alter publication supabase_realtime add table public.caregiver_shifts;

-- inventory snapshot RPC
create or replace function public.snapshot_inventory(p_household_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_total_items int;
  v_total_units numeric;
  v_total_value int;
begin
  select count(*), coalesce(sum(quantity), 0), coalesce(sum(quantity * cost_cents)::int, 0)
    into v_total_items, v_total_units, v_total_value
  from public.inventory_items
  where household_id = p_household_id and archived_at is null;

  insert into public.inventory_snapshots (household_id, total_items, total_units, total_value_cents)
  values (p_household_id, v_total_items, v_total_units, v_total_value)
  on conflict (household_id, taken_on) do update
    set total_items = excluded.total_items,
        total_units = excluded.total_units,
        total_value_cents = excluded.total_value_cents;
end;
$$;

grant execute on function public.snapshot_inventory(uuid) to authenticated;
