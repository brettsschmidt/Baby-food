-- Schema additions for the v2 feature batch.
-- Adds: recipes + ingredients, photos via Supabase Storage refs, push subscriptions,
-- low-stock thresholds, default expiries, allergen first-try tracking, audit log, etc.

-- =====================================================================
-- households: per-household settings + active baby
-- =====================================================================

alter table public.households
  add column if not exists default_freezer_expiry_days int default 60,
  add column if not exists default_fridge_expiry_days int default 3,
  add column if not exists default_pantry_expiry_days int default 365;

-- Per-member preferences (which baby is "active" in the UI, push prefs, etc.)
create table if not exists public.household_member_prefs (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  active_baby_id uuid references public.babies(id) on delete set null,
  notify_on_partner_log boolean not null default true,
  notify_on_low_stock boolean not null default true,
  notify_feed_reminder_hours int default 4,
  primary key (household_id, user_id)
);

alter table public.household_member_prefs enable row level security;
create policy "prefs: self read" on public.household_member_prefs
  for select using (user_id = auth.uid());
create policy "prefs: self upsert" on public.household_member_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- inventory_items: low-stock threshold + photo
-- =====================================================================

alter table public.inventory_items
  add column if not exists low_stock_threshold numeric,
  add column if not exists photo_path text;

-- =====================================================================
-- foods: photo
-- =====================================================================

alter table public.foods
  add column if not exists photo_path text;

-- =====================================================================
-- feedings + feeding_items: photos + first-time allergen flag
-- =====================================================================

alter table public.feedings
  add column if not exists photo_path text;

alter table public.feeding_items
  add column if not exists is_first_try boolean not null default false;

-- =====================================================================
-- recipes
-- =====================================================================

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  description text,
  min_age_months int,
  yield_quantity numeric,
  yield_unit text check (yield_unit in ('cube','jar','pouch','g','ml','serving')) default 'cube',
  prep_minutes int,
  storage_default text check (storage_default in ('fridge','freezer','pantry')) default 'freezer',
  default_expiry_days int,
  steps text,
  source_url text,
  photo_path text,
  archived_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_household_idx on public.recipes(household_id) where archived_at is null;

create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient text not null,
  quantity text,
  position int not null default 0
);

create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients(recipe_id, position);

-- A prep_plan can now reference the recipe it's executing (optional).
alter table public.prep_plans
  add column if not exists recipe_id uuid references public.recipes(id) on delete set null;

-- =====================================================================
-- shopping_list_items
-- =====================================================================

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  text text not null,
  quantity text,
  completed_at timestamptz,
  source_recipe_id uuid references public.recipes(id) on delete set null,
  source_prep_plan_id uuid references public.prep_plans(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists shopping_list_household_idx
  on public.shopping_list_items(household_id, completed_at);

-- =====================================================================
-- push_subscriptions (Web Push API)
-- =====================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
create policy "push: self all" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- activity_log (household-wide who-did-what)
-- =====================================================================

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  kind text not null check (kind in (
    'feeding_logged','feeding_edited','feeding_deleted',
    'inventory_added','inventory_adjusted','inventory_archived',
    'prep_planned','prep_completed',
    'recipe_added','recipe_edited',
    'baby_added','member_joined'
  )),
  ref_id uuid,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_household_created_idx
  on public.activity_log(household_id, created_at desc);

-- =====================================================================
-- RLS for the new household-scoped tables (use the same generic loop)
-- =====================================================================

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.activity_log enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'recipes', 'shopping_list_items', 'activity_log'
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

-- recipe_ingredients RLS via parent
create policy "recipe_ingredients: members" on public.recipe_ingredients
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and public.is_household_member(r.household_id)
    )
  ) with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and public.is_household_member(r.household_id)
    )
  );

-- =====================================================================
-- Realtime additions
-- =====================================================================

alter publication supabase_realtime add table public.recipes;
alter publication supabase_realtime add table public.shopping_list_items;
alter publication supabase_realtime add table public.activity_log;

-- =====================================================================
-- log_activity helper
-- =====================================================================

create or replace function public.log_activity(
  p_household_id uuid, p_kind text, p_ref_id uuid, p_summary text
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.activity_log (household_id, actor_id, kind, ref_id, summary)
  values (p_household_id, auth.uid(), p_kind, p_ref_id, p_summary)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_activity(uuid, text, uuid, text) to authenticated;

-- =====================================================================
-- Storage bucket (must also be created via dashboard or supabase CLI;
-- this just sets up the policies once the bucket "household-photos" exists).
-- =====================================================================

-- Bucket creation: run in SQL editor once if `supabase db push` doesn't carry it.
insert into storage.buckets (id, name, public)
  values ('household-photos', 'household-photos', false)
  on conflict (id) do nothing;

drop policy if exists "household-photos: read members" on storage.objects;
create policy "household-photos: read members" on storage.objects
  for select using (
    bucket_id = 'household-photos'
    and split_part(name, '/', 1)::uuid in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

drop policy if exists "household-photos: write members" on storage.objects;
create policy "household-photos: write members" on storage.objects
  for insert with check (
    bucket_id = 'household-photos'
    and split_part(name, '/', 1)::uuid in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

drop policy if exists "household-photos: delete members" on storage.objects;
create policy "household-photos: delete members" on storage.objects
  for delete using (
    bucket_id = 'household-photos'
    and split_part(name, '/', 1)::uuid in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );
