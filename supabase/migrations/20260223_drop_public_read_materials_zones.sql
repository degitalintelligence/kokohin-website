-- Cleanup legacy public read policies that still allow anon SELECT
-- Materials
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'materials'
      and policyname = 'Public can read active materials'
  ) then
    drop policy "Public can read active materials" on public.materials;
  end if;
exception when others then
  null;
end $$;

-- Zones
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zones'
      and policyname = 'Public can read active zones'
  ) then
    drop policy "Public can read active zones" on public.zones;
  end if;
exception when others then
  null;
end $$;
