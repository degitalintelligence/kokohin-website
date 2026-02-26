alter table if exists public.profiles enable row level security;
alter table if exists public.catalogs enable row level security;

create or replace function public.get_user_role()
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return coalesce(user_role, 'public');
end;
$$;

drop policy if exists "users can view own profile" on public.profiles;
drop policy if exists "admins can manage all profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Super admins can update profiles" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_all_authenticated" on public.profiles;

create policy "profiles_select_authenticated" on public.profiles
for select using (auth.role() = 'authenticated');

create policy "profiles_admin_read_all" on public.profiles
for select using (public.get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_insert_self" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "public can read active catalogs" on public.catalogs;
drop policy if exists "admins can manage catalogs" on public.catalogs;
drop policy if exists "catalogs_public_read_active" on public.catalogs;
drop policy if exists "catalogs_all_authenticated" on public.catalogs;
drop policy if exists "allow_all_catalogs" on public.catalogs;
drop policy if exists "Public can read active catalogs" on public.catalogs;
drop policy if exists "Authenticated can read all catalogs" on public.catalogs;
drop policy if exists "Admins can manage catalogs" on public.catalogs;

create policy "catalogs_public_read_active" on public.catalogs
for select using (is_active = true);

create policy "catalogs_select_authenticated" on public.catalogs
for select using (auth.role() = 'authenticated');

create policy "catalogs_admin_read_all" on public.catalogs
for select using (public.get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "catalogs_admin_insert" on public.catalogs
for insert to authenticated
with check (public.get_user_role() in ('super_admin', 'admin_proyek'));

create policy "catalogs_admin_update" on public.catalogs
for update to authenticated
using (public.get_user_role() in ('super_admin', 'admin_proyek'))
with check (public.get_user_role() in ('super_admin', 'admin_proyek'));

create policy "catalogs_admin_delete" on public.catalogs
for delete to authenticated
using (public.get_user_role() in ('super_admin', 'admin_proyek'));
