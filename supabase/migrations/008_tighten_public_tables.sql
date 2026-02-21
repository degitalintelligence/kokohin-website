-- Migration: 008_tighten_public_tables.sql
-- Tighten RLS policies for public tables (leads, projects, services, testimonials)

-- 1. LEADS
drop policy if exists "public_insert_leads" on leads;
drop policy if exists "admin_all_leads" on leads;
drop policy if exists "Public can insert leads" on leads;
drop policy if exists "Admins can read leads" on leads;
drop policy if exists "Admins can update leads" on leads;
drop policy if exists "Super admin can delete leads" on leads;

create policy "Public can insert leads" on leads
  for insert with check (true);

create policy "Admins can read leads" on leads
  for select using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Admins can update leads" on leads
  for update using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Super admin can delete leads" on leads
  for delete using (get_user_role() = 'super_admin');

-- 2. PROJECTS (Gallery)
drop policy if exists "public_read_projects" on projects;
drop policy if exists "admin_all_projects" on projects;
drop policy if exists "Public can read projects" on projects;
drop policy if exists "Admins can manage projects" on projects;

create policy "Public can read projects" on projects
  for select using (true);

create policy "Admins can manage projects" on projects
  for all using (get_user_role() in ('super_admin', 'admin_proyek'));

-- 3. SERVICES
drop policy if exists "public_read_services" on services;
drop policy if exists "admin_all_services" on services;
drop policy if exists "Public can read services" on services;
drop policy if exists "Admins can manage services" on services;

create policy "Public can read services" on services
  for select using (true);

create policy "Admins can manage services" on services
  for all using (get_user_role() in ('super_admin', 'admin_proyek'));

-- 4. TESTIMONIALS
drop policy if exists "public_read_testimonials" on testimonials;
drop policy if exists "admin_all_testimonials" on testimonials;
drop policy if exists "Public can read active testimonials" on testimonials;
drop policy if exists "Admins can read all testimonials" on testimonials;
drop policy if exists "Admins can manage testimonials" on testimonials;
drop policy if exists "Admins can update testimonials" on testimonials;
drop policy if exists "Admins can delete testimonials" on testimonials;

create policy "Public can read active testimonials" on testimonials
  for select using (active = true);

create policy "Admins can read all testimonials" on testimonials
  for select using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Admins can manage testimonials" on testimonials
  for insert with check (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Admins can update testimonials" on testimonials
  for update using (get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));

create policy "Admins can delete testimonials" on testimonials
  for delete using (get_user_role() = 'super_admin');
