-- Kokohin Mini-ERP Schema
-- Migration: 002_mini_erp_schema.sql
-- Adds tables for mini-ERP according to PRD Section 5

-- ============================================
-- USERS & ROLES (Extended from Supabase Auth)
-- ============================================
-- Supabase Auth already provides auth.users table
-- We create a profiles table to store additional user info and role
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin_proyek' check (role in ('super_admin', 'admin_sales', 'admin_proyek')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Policies: users can read their own profile, admins can read all
create policy "users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "admins can manage all profiles" on profiles
  for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin_sales', 'admin_proyek')));

-- ============================================
-- MATERIALS (Master Data)
-- ============================================
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('atap', 'frame', 'aksesoris', 'lainnya')),
  unit text not null check (unit in ('batang', 'lembar', 'm1', 'm2', 'hari', 'unit')),
  price decimal(12,2) not null check (price >= 0),
  length_per_unit decimal(10,2) not null check (length_per_unit > 0), -- length of one unit in meters (for batang, lembar, etc.)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CATALOGS (Master Pricelist / Paket Populer)
-- ============================================
create table if not exists catalogs (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  title text not null,
  atap_id uuid references materials(id) on delete restrict,
  rangka_id uuid references materials(id) on delete restrict,
  base_price_per_m2 decimal(12,2) not null check (base_price_per_m2 >= 0),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ZONES (Master Zona)
-- ============================================
create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  markup_percentage decimal(5,2) not null default 0.00 check (markup_percentage >= 0),
  flat_fee decimal(12,2) not null default 0 check (flat_fee >= 0),
  created_at timestamptz default now()
);

-- ============================================
-- PROJECTS (Leads) - Note: different from existing 'projects' table (gallery)
-- ============================================
create table if not exists erp_projects (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  zone_id uuid references zones(id) on delete set null,
  custom_notes text,
  status text not null default 'New' check (status in ('New', 'Surveyed', 'Quoted', 'Deal', 'Lost', 'Need Manual Quote')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ESTIMATIONS (Header Costing)
-- ============================================
create table if not exists estimations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references erp_projects(id) on delete cascade,
  version_number int not null default 1,
  total_hpp decimal(12,2) not null default 0 check (total_hpp >= 0),
  margin_percentage decimal(5,2) not null default 30.00 check (margin_percentage >= 0),
  total_selling_price decimal(12,2) not null default 0 check (total_selling_price >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, version_number)
);

-- ============================================
-- ESTIMATION_ITEMS (Detail Costing)
-- ============================================
create table if not exists estimation_items (
  id uuid primary key default gen_random_uuid(),
  estimation_id uuid not null references estimations(id) on delete cascade,
  material_id uuid not null references materials(id) on delete restrict,
  qty_needed decimal(10,2) not null check (qty_needed > 0),
  qty_charged decimal(10,2) not null check (qty_charged >= qty_needed),
  subtotal decimal(12,2) not null check (subtotal >= 0),
  created_at timestamptz default now()
);

-- ============================================
-- PAYMENT_TERMS (Termin Pembayaran)
-- ============================================
create table if not exists payment_terms (
  id uuid primary key default gen_random_uuid(),
  estimation_id uuid not null references estimations(id) on delete cascade,
  term_name text not null check (term_name in ('DP', 'Termin 1', 'Termin 2', 'Pelunasan')),
  percentage decimal(5,2) not null check (percentage >= 0 and percentage <= 100),
  amount_due decimal(12,2) not null check (amount_due >= 0),
  created_at timestamptz default now()
);

-- ============================================
-- RLS POLICIES FOR MINI-ERP TABLES
-- ============================================

-- Enable RLS for all new tables
alter table materials enable row level security;
alter table catalogs enable row level security;
alter table zones enable row level security;
alter table erp_projects enable row level security;
alter table estimations enable row level security;
alter table estimation_items enable row level security;
alter table payment_terms enable row level security;

-- MATERIALS: Readable by all authenticated users, modifiable by admins
create policy "authenticated can read materials" on materials
  for select using (auth.role() = 'authenticated');

create policy "admins can manage materials" on materials
  for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin_sales', 'admin_proyek')));

-- CATALOGS: Public can read active catalogs, admins manage all
create policy "public can read active catalogs" on catalogs
  for select using (is_active = true);

create policy "admins can manage catalogs" on catalogs
  for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin_sales', 'admin_proyek')));

-- ZONES: Readable by authenticated users, modifiable by admins
create policy "authenticated can read zones" on zones
  for select using (auth.role() = 'authenticated');

create policy "admins can manage zones" on zones
  for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin_sales', 'admin_proyek')));

-- ERP_PROJECTS: Authenticated users can read, admins can manage
create policy "authenticated can read erp_projects" on erp_projects
  for select using (auth.role() = 'authenticated');

create policy "admins can manage erp_projects" on erp_projects
  for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin_sales', 'admin_proyek')));

-- ESTIMATIONS: Authenticated users can read, admins can manage
create policy "authenticated can read estimations" on estimations
  for select using (auth.role() = 'authenticated');

create policy "admins can manage estimations" on estimations
  for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin_sales', 'admin_proyek')));

-- ESTIMATION_ITEMS: Authenticated users can read, admins can manage
create policy "authenticated can read estimation_items" on estimation_items
  for select using (auth.role() = 'authenticated');

create policy "admins can manage estimation_items" on estimation_items
  for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin_sales', 'admin_proyek')));

-- PAYMENT_TERMS: Authenticated users can read, admins can manage
create policy "authenticated can read payment_terms" on payment_terms
  for select using (auth.role() = 'authenticated');

create policy "admins can manage payment_terms" on payment_terms
  for all using (auth.uid() in (select id from profiles where role in ('super_admin', 'admin_sales', 'admin_proyek')));

-- ============================================
-- SEED DATA: Default zones and admin user
-- ============================================

-- Insert default zones (Jabodetabek)
insert into zones (name, markup_percentage, flat_fee) values
  ('Jakarta Selatan', 5.00, 0),
  ('Jakarta Timur', 5.00, 0),
  ('Jakarta Barat', 5.00, 0),
  ('Jakarta Utara', 5.00, 0),
  ('Jakarta Pusat', 5.00, 0),
  ('Tangerang Selatan', 3.00, 0),
  ('Depok', 0.00, 0),
  ('Bogor', 2.00, 0),
  ('Bekasi', 3.00, 0)
on conflict (name) do nothing;

-- Note: Admin user creation should be done via Supabase Auth UI or separate script
-- This migration only creates the schema

-- ============================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================

-- Function to calculate qty_charged based on length_per_unit (waste calculation)
create or replace function calculate_qty_charged(
  qty_needed decimal,
  length_per_unit decimal
) returns decimal as $$
begin
  if length_per_unit = 1 then
    return qty_needed;
  else
    return ceil(qty_needed / length_per_unit) * length_per_unit;
  end if;
end;
$$ language plpgsql immutable;

-- Function to update estimation totals when items change
create or replace function update_estimation_totals()
returns trigger as $$
begin
  -- Update total_hpp and total_selling_price in estimations
  update estimations e
  set
    total_hpp = (
      select coalesce(sum(subtotal), 0)
      from estimation_items ei
      where ei.estimation_id = e.id
    ),
    total_selling_price = (
      select coalesce(sum(subtotal), 0) * (1 + e.margin_percentage / 100)
      from estimation_items ei
      where ei.estimation_id = e.id
    )
  where e.id = new.estimation_id;
  return new;
end;
$$ language plpgsql;

-- Trigger to update totals after estimation_items changes
create trigger update_estimation_totals_trigger
after insert or update or delete on estimation_items
for each row execute function update_estimation_totals();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
create index idx_materials_category on materials(category);
create index idx_catalogs_is_active on catalogs(is_active);
create index idx_erp_projects_status on erp_projects(status);
create index idx_estimations_project_id on estimations(project_id);
create index idx_estimation_items_estimation_id on estimation_items(estimation_id);
create index idx_payment_terms_estimation_id on payment_terms(estimation_id);