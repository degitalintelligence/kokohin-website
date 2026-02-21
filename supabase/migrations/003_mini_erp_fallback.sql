-- Kokohin Mini-ERP Fallback Schema
-- Migration: 003_mini_erp_fallback.sql
-- Creates only the essential tables that don't depend on auth.users
-- Run this if 002_mini_erp_schema.sql fails due to missing auth schema

-- ============================================
-- MATERIALS (Master Data) - No auth dependency
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
-- ZONES (Master Zona) - No auth dependency
-- ============================================
create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  markup_percentage decimal(5,2) not null default 0.00 check (markup_percentage >= 0),
  flat_fee decimal(12,2) not null default 0 check (flat_fee >= 0),
  created_at timestamptz default now()
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
-- RLS POLICIES (Simplified - without auth dependency)
-- ============================================

-- Enable RLS for all new tables
alter table materials enable row level security;
alter table catalogs enable row level security;
alter table zones enable row level security;
alter table erp_projects enable row level security;
alter table estimations enable row level security;
alter table estimation_items enable row level security;
alter table payment_terms enable row level security;

-- Simplified policies: allow all for authenticated users (will be enforced by middleware)
-- Note: These policies will work once auth is available
create policy "allow_all_materials" on materials for all using (true);
create policy "allow_all_catalogs" on catalogs for all using (true);
create policy "allow_all_zones" on zones for all using (true);
create policy "allow_all_erp_projects" on erp_projects for all using (true);
create policy "allow_all_estimations" on estimations for all using (true);
create policy "allow_all_estimation_items" on estimation_items for all using (true);
create policy "allow_all_payment_terms" on payment_terms for all using (true);

-- Insert sample zone for testing
insert into zones (name, markup_percentage, flat_fee) values
  ('Jakarta Pusat', 10.00, 500000),
  ('Jakarta Selatan', 12.00, 750000),
  ('Bogor', 15.00, 1000000),
  ('Depok', 14.00, 800000),
  ('Tangerang', 13.00, 700000),
  ('Bekasi', 12.50, 650000)
on conflict (name) do nothing;

-- Insert sample materials for testing
insert into materials (code, name, category, unit, price, length_per_unit) values
  ('ATAP-PC-01', 'Polycarbonate 6mm', 'atap', 'lembar', 250000, 2.1),
  ('ATAP-SP-01', 'Spandek Zincalume', 'atap', 'lembar', 180000, 2.0),
  ('FRAME-BR-01', 'Baja Ringan 0.75mm', 'frame', 'batang', 350000, 6.0),
  ('FRAME-BR-02', 'Baja Ringan 1.00mm', 'frame', 'batang', 450000, 6.0),
  ('AKS-BOLT-01', 'Baut & Mur', 'aksesoris', 'unit', 5000, 1.0),
  ('AKS-SKR-01', 'Sekrup', 'aksesoris', 'unit', 1000, 0.1)
on conflict (code) do nothing;