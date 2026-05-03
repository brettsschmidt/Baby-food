-- v5 schema additions: search, tags, comments, recurring preps, sub-locations,
-- audit trail, sticky notes, today's meals, recipe costs, voice attachments.

create extension if not exists "pg_trgm";

-- =====================================================================
-- Trigram indexes for fuzzy search across foods, recipes, memories.
-- =====================================================================

create index if not exists foods_name_trgm_idx
  on public.foods using gin (lower(name) gin_trgm_ops);
create index if not exists recipes_name_trgm_idx
  on public.recipes using gin (lower(name) gin_trgm_ops);
create index if not exists memories_caption_trgm_idx
  on public.memories using gin (lower(coalesce(caption, '')) gin_trgm_ops);

-- =====================================================================
-- tags (polymorphic — entity_type + entity_id)
-- =====================================================================

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  entity_type text not null check (entity_type in ('food','recipe','memory','feeding','inventory_item')),
  entity_id uuid not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (household_id, entity_type, entity_id, lower(label))
);

create index if not exists tags_entity_idx on public.tags(entity_type, entity_id);
create index if not exists tags_household_label_idx on public.tags(household_id, lower(label));

-- =====================================================================
-- inventory_items: sub_location (e.g., "drawer 1")
-- =====================================================================

alter table public.inventory_items
  add column if not exists sub_location text;

-- =====================================================================
-- prep_plans: recurrence_rule (simple weekly: 'weekly' | 'biweekly' | null)
-- =====================================================================

alter table public.prep_plans
  add column if not exists recurrence text check (recurrence in ('weekly','biweekly')),
  add column if not exists recurrence_until date;

-- =====================================================================
-- feedings: comments are a separate table
-- =====================================================================

create table if not exists public.feeding_comments (
  id uuid primary key default gen_random_uuid(),
  feeding_id uuid not null references public.feedings(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists feeding_comments_feeding_idx
  on public.feeding_comments(feeding_id, created_at);

-- voice notes / audio attachments piggyback on the same Storage bucket
create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  feeding_id uuid references public.feedings(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete cascade,
  storage_path text not null,
  duration_seconds int,
  mime_type text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists voice_notes_feeding_idx on public.voice_notes(feeding_id);
create index if not exists voice_notes_memory_idx on public.voice_notes(memory_id);

-- =====================================================================
-- feeding edits log
-- =====================================================================

create table if not exists public.feeding_edits (
  id uuid primary key default gen_random_uuid(),
  feeding_id uuid not null references public.feedings(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  editor_id uuid references public.profiles(id),
  field text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists feeding_edits_feeding_idx
  on public.feeding_edits(feeding_id, created_at desc);

-- =====================================================================
-- sticky_notes (pinned reminders on dashboard)
-- =====================================================================

create table if not exists public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  body text not null,
  color text default 'amber',
  pinned boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sticky_notes_set_updated_at before update on public.sticky_notes
  for each row execute function public.set_updated_at();

-- =====================================================================
-- meal_plans (today's meals — per-baby per-day schedule)
-- =====================================================================

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  planned_for date not null,
  meal_slot text not null check (meal_slot in ('breakfast','morning_snack','lunch','afternoon_snack','dinner','bedtime_bottle','other')),
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  custom_label text,
  done boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists meal_plans_baby_date_idx
  on public.meal_plans(baby_id, planned_for);

-- =====================================================================
-- recipe_costs: per-recipe cost line items (separate so editing yield
-- doesn't churn the recipes table)
-- =====================================================================

create table if not exists public.recipe_costs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient text not null,
  cost_cents int not null check (cost_cents >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists recipe_costs_recipe_idx on public.recipe_costs(recipe_id);

-- =====================================================================
-- search_household RPC (combined trigram search)
-- =====================================================================

create or replace function public.search_household(
  p_household_id uuid,
  p_query text
)
returns table(kind text, id uuid, label text, sublabel text, score real)
language sql
stable
security definer set search_path = public
as $$
  select 'food'::text as kind, f.id, f.name as label,
    coalesce(f.category, '') as sublabel,
    similarity(lower(f.name), lower(p_query)) as score
  from public.foods f
  where f.household_id = p_household_id
    and f.archived_at is null
    and lower(f.name) % lower(p_query)
  union all
  select 'recipe', r.id, r.name,
    coalesce(r.description, ''),
    similarity(lower(r.name), lower(p_query))
  from public.recipes r
  where r.household_id = p_household_id
    and r.archived_at is null
    and lower(r.name) % lower(p_query)
  union all
  select 'memory', m.id, coalesce(m.caption, m.milestone_kind, 'Memory'),
    coalesce(m.milestone_kind, ''),
    similarity(lower(coalesce(m.caption, '')), lower(p_query))
  from public.memories m
  where m.household_id = p_household_id
    and lower(coalesce(m.caption, '')) % lower(p_query)
  order by score desc nulls last
  limit 30;
$$;

grant execute on function public.search_household(uuid, text) to authenticated;

-- =====================================================================
-- RLS on the new household-scoped tables
-- =====================================================================

alter table public.tags enable row level security;
alter table public.feeding_comments enable row level security;
alter table public.voice_notes enable row level security;
alter table public.feeding_edits enable row level security;
alter table public.sticky_notes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.recipe_costs enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'tags','voice_notes','sticky_notes','meal_plans','feeding_edits'
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

-- feeding_comments + recipe_costs: scope via parent
create policy "feeding_comments: members" on public.feeding_comments
  for all using (
    exists (
      select 1 from public.feedings f
      where f.id = feeding_comments.feeding_id
        and public.is_household_member(f.household_id)
    )
  ) with check (
    exists (
      select 1 from public.feedings f
      where f.id = feeding_comments.feeding_id
        and public.is_household_member(f.household_id)
    )
  );

create policy "recipe_costs: members" on public.recipe_costs
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_costs.recipe_id
        and public.is_household_member(r.household_id)
    )
  ) with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_costs.recipe_id
        and public.is_household_member(r.household_id)
    )
  );

-- Realtime
alter publication supabase_realtime add table public.feeding_comments;
alter publication supabase_realtime add table public.sticky_notes;
alter publication supabase_realtime add table public.meal_plans;
