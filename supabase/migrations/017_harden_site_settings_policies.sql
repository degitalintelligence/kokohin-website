-- Ensure strict RLS on site_settings
alter table public.site_settings enable row level security;

-- Drop existing policies to avoid permissive overlaps
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname='public' and tablename='site_settings'
  loop
    execute format('drop policy %I on public.site_settings', pol.policyname);
  end loop;
end $$;

-- Public may read
create policy "public_read_site_settings"
  on public.site_settings for select using (true);

-- Admins may update only
create policy "admins_update_site_settings"
  on public.site_settings for update
  using (public.get_user_role() in ('super_admin','admin_sales','admin_proyek'))
  with check (public.get_user_role() in ('super_admin','admin_sales','admin_proyek'));

-- Super admin may insert/delete
create policy "super_admin_insert_site_settings"
  on public.site_settings for insert
  with check (public.get_user_role() = 'super_admin');

create policy "super_admin_delete_site_settings"
  on public.site_settings for delete
  using (public.get_user_role() = 'super_admin');

