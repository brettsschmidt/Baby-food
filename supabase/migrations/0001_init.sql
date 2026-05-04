-- Baby-food initial schema
-- Tables, RLS policies, triggers, and the redeem_invite RPC.

create extension if not exists "pgcrypto";

-- =====================================================================
-- Helpers
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- profiles (1:1 with auth.users)
-- =====================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- households + membership
-- =====================================================================

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger households_set_updated_at before update on public.households
  for each row execute function public.set_updated_at();

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members(user_id);

-- Auto-add creator as owner
create or replace function public.handle_household_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger households_after_insert
  after insert on public.households
  for each row execute function public.handle_household_created();

-- Membership-check helper used by RLS
create or replace function public.is_household_member(h uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = h and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(h uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = h and user_id = auth.uid() and role = 'owner'
  );
$$;

-- =====================================================================
-- household_invites
-- =====================================================================

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses int default 1,
  use_count int not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index household_invites_household_idx on public.household_invites(household_id);

-- =====================================================================
-- babies
-- =====================================================================

create table public.babies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  birth_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger babies_set_updated_at before update on public.babies
  for each row execute function public.set_updated_at();

-- =====================================================================
-- foods (per-household catalog)
-- =====================================================================

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text,
  min_age_months int,
  allergens text[] not null default '{}',
  texture text check (texture in ('puree', 'mash', 'soft', 'finger')),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index foods_household_name_unique_idx on public.foods(household_id, lower(name));
create index foods_household_idx on public.foods(household_id) where archived_at is null;

create trigger foods_set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();

-- =====================================================================
-- prep_plans + prep_plan_items
-- =====================================================================

create table public.prep_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  scheduled_for date not null,
  status text not null check (status in ('planned', 'in_progress', 'done', 'skipped')) default 'planned',
  notes text,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prep_plans_household_date_idx on public.prep_plans(household_id, scheduled_for);

create trigger prep_plans_set_updated_at before update on public.prep_plans
  for each row execute function public.set_updated_at();

-- inventory_items declared first (forward ref from prep_plan_items)
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  food_id uuid references public.foods(id),
  name text,
  storage text not null check (storage in ('fridge', 'freezer', 'pantry')) default 'freezer',
  unit text not null check (unit in ('cube', 'jar', 'pouch', 'g', 'ml', 'serving')) default 'cube',
  quantity numeric not null check (quantity >= 0) default 0,
  initial_quantity numeric not null default 0,
  prep_date date,
  expiry_date date,
  batch_id uuid references public.prep_plans(id) on delete set null,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inventory_items_household_expiry_idx
  on public.inventory_items(household_id, expiry_date)
  where archived_at is null;

create index inventory_items_household_food_idx
  on public.inventory_items(household_id, food_id)
  where archived_at is null;

create trigger inventory_items_set_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();

create table public.prep_plan_items (
  id uuid primary key default gen_random_uuid(),
  prep_plan_id uuid not null references public.prep_plans(id) on delete cascade,
  food_id uuid references public.foods(id),
  planned_quantity numeric not null,
  unit text not null default 'cube',
  actual_quantity numeric,
  produced_inventory_item_id uuid references public.inventory_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create index prep_plan_items_plan_idx on public.prep_plan_items(prep_plan_id);

-- =====================================================================
-- feedings + feeding_items
-- =====================================================================

create table public.feedings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  fed_at timestamptz not null default now(),
  fed_by uuid references public.profiles(id),
  method text check (method in ('spoon', 'self_feed', 'bottle', 'breast')) default 'spoon',
  mood text check (mood in ('loved', 'liked', 'neutral', 'disliked', 'refused')),
  amount_consumed numeric,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feedings_household_fedat_idx on public.feedings(household_id, fed_at desc) where archived_at is null;
create index feedings_baby_fedat_idx on public.feedings(baby_id, fed_at desc) where archived_at is null;

create trigger feedings_set_updated_at before update on public.feedings
  for each row execute function public.set_updated_at();

create table public.feeding_items (
  id uuid primary key default gen_random_uuid(),
  feeding_id uuid not null references public.feedings(id) on delete cascade,
  food_id uuid references public.foods(id),
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  quantity numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index feeding_items_feeding_idx on public.feeding_items(feeding_id);
create index feeding_items_inventory_idx on public.feeding_items(inventory_item_id);

-- =====================================================================
-- inventory_movements (append-only ledger)
-- =====================================================================

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  delta numeric not null,
  reason text not null check (reason in ('prep', 'feeding', 'waste', 'correction', 'restock')),
  feeding_id uuid references public.feedings(id) on delete set null,
  prep_plan_id uuid references public.prep_plans(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index inventory_movements_item_idx on public.inventory_movements(inventory_item_id, created_at desc);

-- Update inventory_items.quantity when a movement is inserted.
create or replace function public.handle_inventory_movement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.inventory_items
  set quantity = greatest(0, quantity + new.delta)
  where id = new.inventory_item_id;
  return new;
end;
$$;

create trigger inventory_movements_after_insert
  after insert on public.inventory_movements
  for each row execute function public.handle_inventory_movement();

-- Auto-create a feeding movement when feeding_items references inventory.
create or replace function public.handle_feeding_item()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_household uuid;
begin
  if new.inventory_item_id is null or new.quantity is null or new.quantity = 0 then
    return new;
  end if;

  select household_id into v_household
  from public.feedings where id = new.feeding_id;

  insert into public.inventory_movements
    (household_id, inventory_item_id, delta, reason, feeding_id, created_by)
  values
    (v_household, new.inventory_item_id, -new.quantity, 'feeding', new.feeding_id, auth.uid());

  return new;
end;
$$;

create trigger feeding_items_after_insert
  after insert on public.feeding_items
  for each row execute function public.handle_feeding_item();

-- =====================================================================
-- redeem_invite RPC
-- =====================================================================

create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite public.household_invites%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_invite
  from public.household_invites
  where code = upper(replace(p_code, '-', ''))
  for update;

  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'invite revoked' using errcode = 'P0003';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'invite expired' using errcode = 'P0004';
  end if;

  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'invite exhausted' using errcode = 'P0005';
  end if;

  -- Idempotent: if already a member, just succeed.
  if exists (
    select 1 from public.household_members
    where household_id = v_invite.household_id and user_id = v_uid
  ) then
    return v_invite.household_id;
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_invite.household_id, v_uid, 'member');

  update public.household_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

revoke all on function public.redeem_invite(text) from public;
grant execute on function public.redeem_invite(text) to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.babies enable row level security;
alter table public.foods enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.prep_plans enable row level security;
alter table public.prep_plan_items enable row level security;
alter table public.feedings enable row level security;
alter table public.feeding_items enable row level security;

-- profiles
create policy "profiles: read self" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: read shared household members" on public.profiles
  for select using (
    exists (
      select 1
      from public.household_members me
      join public.household_members them on them.household_id = me.household_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );
create policy "profiles: update self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: insert self" on public.profiles
  for insert with check (auth.uid() = id);

-- households
create policy "households: read members" on public.households
  for select using (public.is_household_member(id));
create policy "households: insert by authed" on public.households
  for insert with check (auth.uid() = created_by);
create policy "households: owner update" on public.households
  for update using (public.is_household_owner(id)) with check (public.is_household_owner(id));
create policy "households: owner delete" on public.households
  for delete using (public.is_household_owner(id));

-- household_members
create policy "members: read own household" on public.household_members
  for select using (public.is_household_member(household_id) or user_id = auth.uid());
create policy "members: owner manage" on public.household_members
  for all using (public.is_household_owner(household_id))
  with check (public.is_household_owner(household_id));
create policy "members: leave self" on public.household_members
  for delete using (user_id = auth.uid());

-- household_invites
create policy "invites: members read" on public.household_invites
  for select using (public.is_household_member(household_id));
create policy "invites: owner insert" on public.household_invites
  for insert with check (public.is_household_owner(household_id) and created_by = auth.uid());
create policy "invites: owner update" on public.household_invites
  for update using (public.is_household_owner(household_id))
  with check (public.is_household_owner(household_id));
create policy "invites: owner delete" on public.household_invites
  for delete using (public.is_household_owner(household_id));

-- Generic per-table household-scoped RLS
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'babies', 'foods', 'inventory_items', 'inventory_movements',
    'prep_plans', 'feedings'
  ])
  loop
    execute format($f$
      create policy "%1$s: members read" on public.%1$I
        for select using (public.is_household_member(household_id));
      create policy "%1$s: members write" on public.%1$I
        for insert with check (public.is_household_member(household_id));
      create policy "%1$s: members update" on public.%1$I
        for update using (public.is_household_member(household_id))
        with check (public.is_household_member(household_id));
      create policy "%1$s: members delete" on public.%1$I
        for delete using (public.is_household_member(household_id));
    $f$, t);
  end loop;
end $$;

-- Child tables — gate via parent's household
create policy "prep_plan_items: members" on public.prep_plan_items
  for all using (
    exists (
      select 1 from public.prep_plans p
      where p.id = prep_plan_items.prep_plan_id
        and public.is_household_member(p.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.prep_plans p
      where p.id = prep_plan_items.prep_plan_id
        and public.is_household_member(p.household_id)
    )
  );

create policy "feeding_items: members" on public.feeding_items
  for all using (
    exists (
      select 1 from public.feedings f
      where f.id = feeding_items.feeding_id
        and public.is_household_member(f.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.feedings f
      where f.id = feeding_items.feeding_id
        and public.is_household_member(f.household_id)
    )
  );
