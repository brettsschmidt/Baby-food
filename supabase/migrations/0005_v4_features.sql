-- v4 schema additions: theming, units, supplements, sessions, memories,
-- recipe collections, share links, TOTP secrets, error logs, caregiver role.

-- =====================================================================
-- households: theming + units + (already has theme_color, accent_emoji, etc.)
-- =====================================================================

alter table public.households
  add column if not exists theme_mode text check (theme_mode in ('light','dark','system')) default 'system',
  add column if not exists units_preference text check (units_preference in ('metric','imperial')) default 'metric';

-- =====================================================================
-- household_member_prefs: supplement reminders + voice
-- =====================================================================

alter table public.household_member_prefs
  add column if not exists vitamin_reminder_hours int,
  add column if not exists iron_reminder_hours int,
  add column if not exists voice_log_enabled boolean not null default true,
  add column if not exists active_household_id uuid references public.households(id) on delete set null;

-- =====================================================================
-- household_members: extend role check to include caregiver
-- =====================================================================

alter table public.household_members
  drop constraint if exists household_members_role_check;
alter table public.household_members
  add constraint household_members_role_check
  check (role in ('owner','member','caregiver'));

-- Invites can carry a role so caregiver invites can mint caregiver-only members.
alter table public.household_invites
  add column if not exists role text not null default 'member'
  check (role in ('member','caregiver'));

-- Replace redeem_invite to honour invite.role.
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

  if exists (
    select 1 from public.household_members
    where household_id = v_invite.household_id and user_id = v_uid
  ) then
    return v_invite.household_id;
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_invite.household_id, v_uid, v_invite.role);

  update public.household_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

-- =====================================================================
-- supplement_logs
-- =====================================================================

create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  kind text not null check (kind in ('vitamin_d','iron','other')),
  given_at timestamptz not null default now(),
  dose text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists supplement_baby_given_idx
  on public.supplement_logs(baby_id, given_at desc);

-- =====================================================================
-- feeding_sessions (bottle ml + breast side + duration)
-- =====================================================================

create table if not exists public.feeding_sessions (
  feeding_id uuid primary key references public.feedings(id) on delete cascade,
  bottle_ml numeric,
  breast_side text check (breast_side in ('left','right','both')),
  duration_minutes int
);

-- =====================================================================
-- readiness_evaluations (per-baby)
-- =====================================================================

create table if not exists public.readiness_evaluations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  evaluated_on date not null default current_date,
  sits_unsupported boolean,
  has_head_control boolean,
  lost_tongue_thrust boolean,
  shows_interest boolean,
  can_grasp boolean,
  ready boolean,                                  -- computed verdict
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists readiness_baby_idx
  on public.readiness_evaluations(baby_id, evaluated_on desc);

-- =====================================================================
-- memories
-- =====================================================================

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid references public.babies(id) on delete cascade,
  photo_path text,
  caption text,
  occurred_on date not null default current_date,
  milestone_kind text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists memories_household_occurred_idx
  on public.memories(household_id, occurred_on desc);

-- =====================================================================
-- recipe_collections + items
-- =====================================================================

create table if not exists public.recipe_collections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  description text,
  is_public_template boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recipe_collections_set_updated_at before update on public.recipe_collections
  for each row execute function public.set_updated_at();

create index if not exists recipe_collections_household_idx
  on public.recipe_collections(household_id);
create index if not exists recipe_collections_public_idx
  on public.recipe_collections(is_public_template) where is_public_template = true;

create table if not exists public.recipe_collection_items (
  collection_id uuid not null references public.recipe_collections(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position int not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, recipe_id)
);

create index if not exists recipe_collection_items_recipe_idx
  on public.recipe_collection_items(recipe_id);

-- =====================================================================
-- share_links (public read-only family viewer)
-- =====================================================================

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token text not null unique,
  scope text not null check (scope in ('feed','growth','memories','all')) default 'all',
  expires_at timestamptz not null default (now() + interval '90 days'),
  revoked_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  last_viewed_at timestamptz,
  view_count int not null default 0
);

create index if not exists share_links_household_idx on public.share_links(household_id);

-- =====================================================================
-- totp_secrets (one row per user)
-- =====================================================================

create table if not exists public.totp_secrets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  secret_encrypted text not null,
  confirmed_at timestamptz,
  recovery_codes text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger totp_secrets_set_updated_at before update on public.totp_secrets
  for each row execute function public.set_updated_at();

alter table public.totp_secrets enable row level security;
create policy "totp: self all" on public.totp_secrets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- error_logs (self-hosted observability)
-- =====================================================================

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  household_id uuid references public.households(id) on delete set null,
  surface text not null check (surface in ('client','server','edge')),
  message text not null,
  digest text,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists error_logs_created_idx on public.error_logs(created_at desc);

-- error_logs intentionally has NO row-level read policies for users — only
-- the service-role client (used by /admin) can read it. Inserts come via
-- security-definer RPC so unauthenticated reports still work.
alter table public.error_logs enable row level security;

create or replace function public.report_error(
  p_surface text, p_message text, p_digest text, p_stack text,
  p_url text, p_user_agent text, p_household_id uuid
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.error_logs (user_id, household_id, surface, message, digest, stack, url, user_agent)
  values (auth.uid(), p_household_id, p_surface, p_message, p_digest, p_stack, p_url, p_user_agent)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.report_error(text, text, text, text, text, text, uuid) to anon, authenticated;

-- =====================================================================
-- RLS for new household-scoped tables
-- =====================================================================

alter table public.supplement_logs enable row level security;
alter table public.feeding_sessions enable row level security;
alter table public.readiness_evaluations enable row level security;
alter table public.memories enable row level security;
alter table public.recipe_collections enable row level security;
alter table public.recipe_collection_items enable row level security;
alter table public.share_links enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'supplement_logs','readiness_evaluations','memories',
    'recipe_collections','share_links'
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

-- feeding_sessions RLS via parent
create policy "feeding_sessions: members" on public.feeding_sessions
  for all using (
    exists (
      select 1 from public.feedings f
      where f.id = feeding_sessions.feeding_id
        and public.is_household_member(f.household_id)
    )
  ) with check (
    exists (
      select 1 from public.feedings f
      where f.id = feeding_sessions.feeding_id
        and public.is_household_member(f.household_id)
    )
  );

-- recipe_collection_items RLS via parent
create policy "recipe_collection_items: members" on public.recipe_collection_items
  for all using (
    exists (
      select 1 from public.recipe_collections rc
      where rc.id = recipe_collection_items.collection_id
        and (public.is_household_member(rc.household_id) or rc.is_public_template)
    )
  ) with check (
    exists (
      select 1 from public.recipe_collections rc
      where rc.id = recipe_collection_items.collection_id
        and public.is_household_member(rc.household_id)
    )
  );

-- recipe_collections: extend read to include public templates
drop policy if exists "recipe_collections: members read" on public.recipe_collections;
create policy "recipe_collections: members read" on public.recipe_collections
  for select using (public.is_household_member(household_id) or is_public_template);

-- =====================================================================
-- Public read of share-link payloads via RPC
-- =====================================================================

create or replace function public.fetch_share_link(p_token text)
returns table(
  household_id uuid,
  scope text,
  expires_at timestamptz,
  revoked boolean
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.share_links%rowtype;
begin
  select * into v_row from public.share_links where token = p_token;
  if not found then
    return;
  end if;
  if v_row.revoked_at is not null or v_row.expires_at < now() then
    return query select v_row.household_id, v_row.scope, v_row.expires_at, true;
    return;
  end if;
  update public.share_links
    set last_viewed_at = now(), view_count = view_count + 1
    where id = v_row.id;
  return query select v_row.household_id, v_row.scope, v_row.expires_at, false;
end;
$$;

grant execute on function public.fetch_share_link(text) to anon, authenticated;

-- Realtime additions
alter publication supabase_realtime add table public.supplement_logs;
alter publication supabase_realtime add table public.memories;
alter publication supabase_realtime add table public.recipe_collections;
