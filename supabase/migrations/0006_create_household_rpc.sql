-- Bootstrap-household helper. Used by the onboarding flow.
-- Direct REST INSERTs into public.households were failing the
-- auth.uid() = created_by RLS check on this project despite auth.uid()
-- resolving correctly (Supabase JWT verification quirk during INSERT
-- evaluation). Wrapping the insert in a SECURITY DEFINER RPC sidesteps it
-- and is also a more idiomatic pattern for "create the row that bootstraps
-- my membership".

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name required' using errcode = '22023';
  end if;

  insert into public.households (name, created_by)
  values (trim(p_name), v_uid)
  returning id into v_id;

  -- handle_household_created trigger inserts the owner membership.
  return v_id;
end;
$$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;
