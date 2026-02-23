-- Lock public SELECT on zones and restrict to authenticated/admins
alter table if exists public.zones enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='allow_all_zones') then
    drop policy "allow_all_zones" on public.zones;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='public can read zones') then
    drop policy "public can read zones" on public.zones;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='Public can read active zones') then
    drop policy "Public can read active zones" on public.zones;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='authenticated can read zones') then
    drop policy "authenticated can read zones" on public.zones;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='Authenticated can read zones') then
    drop policy "Authenticated can read zones" on public.zones;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='zones_select_authenticated') then
    drop policy "zones_select_authenticated" on public.zones;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='zones_all_authenticated') then
    drop policy "zones_all_authenticated" on public.zones;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='admins can manage zones') then
    drop policy "admins can manage zones" on public.zones;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='zones' and policyname='Admins can manage zones') then
    drop policy "Admins can manage zones" on public.zones;
  end if;
exception when others then
  null;
end $$;

create policy "Authenticated can read zones"
  on public.zones for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage zones"
  on public.zones for all
  using (public.get_user_role() in ('super_admin','admin_sales','admin_proyek'));
