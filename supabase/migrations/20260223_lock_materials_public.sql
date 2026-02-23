-- Lock public SELECT on materials and restrict to authenticated/admins
alter table if exists public.materials enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='allow_all_materials') then
    drop policy "allow_all_materials" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='public can read materials') then
    drop policy "public can read materials" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='Public can read active materials') then
    drop policy "Public can read active materials" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='authenticated can read materials') then
    drop policy "authenticated can read materials" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='Authenticated can read materials') then
    drop policy "Authenticated can read materials" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='materials_select_authenticated') then
    drop policy "materials_select_authenticated" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='materials_all_authenticated') then
    drop policy "materials_all_authenticated" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='admins can manage materials') then
    drop policy "admins can manage materials" on public.materials;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='materials' and policyname='Admins can manage materials') then
    drop policy "Admins can manage materials" on public.materials;
  end if;
exception when others then
  null;
end $$;

create policy "Authenticated can read materials"
  on public.materials for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage materials"
  on public.materials for all
  using (public.get_user_role() in ('super_admin','admin_sales','admin_proyek'));
