-- Remove legacy overly-permissive materials policies
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='materials_fallback_all') then
    drop policy "materials_fallback_all" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='materials_admin_all') then
    drop policy "materials_admin_all" on public.materials;
  end if;
exception when others then
  null;
end $$;

-- Ensure only restrictive policies remain
alter table if exists public.materials enable row level security;
