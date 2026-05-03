-- Enable Supabase Realtime on the tables both parents will watch live.
-- Subscribers still go through RLS, so cross-household leakage is prevented.

alter publication supabase_realtime add table public.feedings;
alter publication supabase_realtime add table public.feeding_items;
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.inventory_movements;
