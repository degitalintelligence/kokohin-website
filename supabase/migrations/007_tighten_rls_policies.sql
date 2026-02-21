-- Migration: 007_tighten_rls_policies.sql
-- Tighten RLS policies for production

-- Helper function to get user role safely
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 1. PROFILES
drop policy if exists "profiles_select_authenticated" on profiles;
drop policy if exists "profiles_all_authenticated" on profiles;
drop policy if exists "users can view own profile" on profiles;
drop policy if exists "admins can manage all profiles" on profiles;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Admins can read all profiles" on profiles
  for select using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Super admins can update profiles" on profiles
  for update using (get_user_role() = 'super_admin');

-- 2. MATERIALS
drop policy if exists "materials_select_authenticated" on materials;
drop policy if exists "materials_all_authenticated" on materials;
drop policy if exists "authenticated can read materials" on materials;
drop policy if exists "admins can manage materials" on materials;

create policy "Authenticated can read materials" on materials
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage materials" on materials
  for all using (get_user_role() in ('super_admin', 'admin_proyek'));

-- 3. ZONES
drop policy if exists "zones_select_authenticated" on zones;
drop policy if exists "zones_all_authenticated" on zones;
drop policy if exists "authenticated can read zones" on zones;
drop policy if exists "admins can manage zones" on zones;

create policy "Authenticated can read zones" on zones
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage zones" on zones
  for all using (get_user_role() in ('super_admin', 'admin_proyek'));

-- 4. CATALOGS
drop policy if exists "catalogs_public_read_active" on catalogs;
drop policy if exists "catalogs_all_authenticated" on catalogs;
drop policy if exists "public can read active catalogs" on catalogs;
drop policy if exists "admins can manage catalogs" on catalogs;

create policy "Public can read active catalogs" on catalogs
  for select using (is_active = true);

create policy "Authenticated can read all catalogs" on catalogs
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage catalogs" on catalogs
  for all using (get_user_role() in ('super_admin', 'admin_proyek'));

-- 5. ERP_PROJECTS (Leads)
drop policy if exists "erp_projects_select_authenticated" on erp_projects;
drop policy if exists "erp_projects_all_authenticated" on erp_projects;
drop policy if exists "authenticated can read erp_projects" on erp_projects;
drop policy if exists "admins can manage erp_projects" on erp_projects;

create policy "Public can insert leads" on erp_projects
  for insert with check (true);

create policy "Authenticated can read leads" on erp_projects
  for select using (auth.role() = 'authenticated');

create policy "Admins can update leads" on erp_projects
  for update using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Super admin can delete leads" on erp_projects
  for delete using (get_user_role() = 'super_admin');

-- 6. ESTIMATIONS
drop policy if exists "estimations_select_authenticated" on estimations;
drop policy if exists "estimations_all_authenticated" on estimations;
drop policy if exists "authenticated can read estimations" on estimations;
drop policy if exists "admins can manage estimations" on estimations;

create policy "Public can insert estimations" on estimations
  for insert with check (true);

create policy "Authenticated can read estimations" on estimations
  for select using (auth.role() = 'authenticated');

create policy "Admins can update estimations" on estimations
  for update using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Super admin can delete estimations" on estimations
  for delete using (get_user_role() = 'super_admin');

-- 7. ESTIMATION_ITEMS
drop policy if exists "authenticated can read estimation_items" on estimation_items;
drop policy if exists "admins can manage estimation_items" on estimation_items;

create policy "Public can insert estimation items" on estimation_items
  for insert with check (true);

create policy "Authenticated can read estimation items" on estimation_items
  for select using (auth.role() = 'authenticated');

create policy "Admins can update estimation items" on estimation_items
  for update using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Super admin can delete estimation items" on estimation_items
  for delete using (get_user_role() = 'super_admin');

-- 8. PAYMENT_TERMS
drop policy if exists "authenticated can read payment_terms" on payment_terms;
drop policy if exists "admins can manage payment_terms" on payment_terms;

create policy "Public can insert payment terms" on payment_terms
  for insert with check (true);

create policy "Authenticated can read payment terms" on payment_terms
  for select using (auth.role() = 'authenticated');

create policy "Admins can update payment terms" on payment_terms
  for update using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Super admin can delete payment terms" on payment_terms
  for delete using (get_user_role() = 'super_admin');