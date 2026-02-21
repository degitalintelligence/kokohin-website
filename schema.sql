-- ============================================================
-- KOKOHIN DATABASE SCHEMA
-- Jalankan seluruh file ini di Supabase SQL Editor
-- (via Coolify → Supabase Studio → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── SERVICES ──────────────────────────────────────────────
create table if not exists services (
    id          uuid primary key default uuid_generate_v4(),
    name        text not null,
    slug        text not null unique,
    short_desc  text not null default '',
    description text not null default '',
    icon        text not null default '',
    image_url   text,
    "order"     int  not null default 0,
    created_at  timestamptz not null default now()
);

-- Seed services
insert into services (name, slug, short_desc, icon, "order") values
    ('Kanopi Baja Ringan',   'baja-ringan',   'Kanopi dengan rangka baja ringan',   '🏗️', 1),
    ('Kanopi Polycarbonate', 'polycarbonate', 'Kanopi dengan atap polycarbonate',   '☀️', 2),
    ('Kanopi Kaca',          'kaca',          'Kanopi dengan atap kaca tempered',   '🪟', 3),
    ('Kanopi Spandek',       'spandek',       'Kanopi dengan atap spandek',         '🔩', 4),
    ('Pergola',              'pergola',       'Struktur pergola kayu / besi',       '🌿', 5)
on conflict (slug) do nothing;

-- ── LEADS ─────────────────────────────────────────────────
create table if not exists leads (
    id          uuid primary key default uuid_generate_v4(),
    name        text not null,
    phone       text not null,
    email       text,
    location    text not null default '',
    service_id  uuid references services(id) on delete set null,
    message     text,
    status      text not null default 'new'
                check (status in ('new','contacted','quoted','closed')),
    created_at  timestamptz not null default now()
);

-- ── PROJECTS (Gallery) ────────────────────────────────────
create table if not exists projects (
    id          uuid primary key default uuid_generate_v4(),
    title       text not null,
    service_id  uuid references services(id) on delete set null,
    images      text[] not null default '{}',
    location    text not null default '',
    year        int  not null default extract(year from now())::int,
    featured    boolean not null default false,
    created_at  timestamptz not null default now()
);

-- ── MATERIALS (Mini-ERP) ──────────────────────────────────
create table if not exists materials (
    id                  uuid primary key default uuid_generate_v4(),
    code                text not null unique,
    name                text not null,
    category            text not null default 'lainnya'
                        check (category in ('atap','frame','aksesoris','lainnya')),
    unit                text not null default 'unit'
                        check (unit in ('batang','lembar','m1','m2','hari','unit')),
    base_price_per_unit numeric(12,2) not null default 0,
    length_per_unit     numeric(6,2),          -- null = satuan, >1 = batang/lembaran
    is_active           boolean not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- ── ZONES ─────────────────────────────────────────────────
create table if not exists zones (
    id                  uuid primary key default uuid_generate_v4(),
    name                text not null,
    markup_percentage   numeric(5,2) not null default 0,
    flat_fee            numeric(12,2) not null default 0,
    created_at          timestamptz not null default now()
);

-- Seed zones
insert into zones (name, markup_percentage, flat_fee) values
    ('Jabodetabek', 0,   0),
    ('Jawa Barat',  5,   500000),
    ('Jawa Tengah', 7,   750000),
    ('Jawa Timur',  7,   750000),
    ('Luar Jawa',   15,  2000000)
on conflict do nothing;

-- ── CATALOGS ──────────────────────────────────────────────
create table if not exists catalogs (
    id                  uuid primary key default uuid_generate_v4(),
    title               text not null,
    image_url           text,
    atap_id             uuid references materials(id) on delete set null,
    rangka_id           uuid references materials(id) on delete set null,
    base_price_per_m2   numeric(12,2) not null default 0,
    is_active           boolean not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- ── ERP PROJECTS ──────────────────────────────────────────
create table if not exists erp_projects (
    id              uuid primary key default uuid_generate_v4(),
    customer_name   text not null,
    phone           text not null,
    address         text not null default '',
    zone_id         uuid references zones(id) on delete set null,
    custom_notes    text,
    status          text not null default 'New'
                    check (status in ('New','Surveyed','Quoted','Deal','Lost','Need Manual Quote')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ── ESTIMATIONS ───────────────────────────────────────────
create table if not exists estimations (
    id                  uuid primary key default uuid_generate_v4(),
    project_id          uuid not null references erp_projects(id) on delete cascade,
    version_number      int  not null default 1,
    total_hpp           numeric(14,2) not null default 0,
    margin_percentage   numeric(5,2)  not null default 20,
    total_selling_price numeric(14,2) not null default 0,
    status              text not null default 'draft'
                        check (status in ('draft','sent','approved','rejected')),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- ── ESTIMATION ITEMS ──────────────────────────────────────
create table if not exists estimation_items (
    id              uuid primary key default uuid_generate_v4(),
    estimation_id   uuid not null references estimations(id) on delete cascade,
    material_id     uuid not null references materials(id),
    qty_needed      numeric(10,3) not null default 0,
    qty_charged     numeric(10,3) not null default 0,
    subtotal        numeric(14,2) not null default 0,
    created_at      timestamptz not null default now()
);

-- ── PAYMENT TERMS ──────────────────────────────────────────
create table if not exists payment_terms (
    id              uuid primary key default uuid_generate_v4(),
    estimation_id   uuid not null references estimations(id) on delete cascade,
    term_name       text not null
                    check (term_name in ('DP','Termin 1','Termin 2','Pelunasan')),
    percentage      numeric(5,2) not null default 0,
    amount_due      numeric(14,2) not null default 0,
    created_at      timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────
-- Aktifkan RLS untuk semua tabel
alter table services         enable row level security;
alter table leads            enable row level security;
alter table projects         enable row level security;
alter table materials        enable row level security;
alter table zones            enable row level security;
alter table catalogs         enable row level security;
alter table erp_projects     enable row level security;
alter table estimations      enable row level security;
alter table estimation_items enable row level security;
alter table payment_terms    enable row level security;

-- ── POLICIES (idempotent: drop dulu sebelum create) ────────

-- Services
drop policy if exists "services_public_read" on services;
create policy "services_public_read" on services
    for select using (true);

-- Projects
drop policy if exists "projects_public_read" on projects;
create policy "projects_public_read" on projects
    for select using (true);

-- Leads: publik bisa insert (form kontak), admin bisa semua
drop policy if exists "leads_public_insert" on leads;
create policy "leads_public_insert" on leads
    for insert with check (true);

drop policy if exists "leads_admin_all" on leads;
create policy "leads_admin_all" on leads
    for all using (auth.role() = 'authenticated');

-- Materials
drop policy if exists "materials_admin_all" on materials;
create policy "materials_admin_all" on materials
    for all using (auth.role() = 'authenticated');

-- Zones
drop policy if exists "zones_admin_all" on zones;
create policy "zones_admin_all" on zones
    for all using (auth.role() = 'authenticated');

-- Catalogs
drop policy if exists "catalogs_admin_read" on catalogs;
create policy "catalogs_admin_read" on catalogs
    for select using (true);

drop policy if exists "catalogs_admin_write" on catalogs;
create policy "catalogs_admin_write" on catalogs
    for all using (auth.role() = 'authenticated');

-- ERP Projects
drop policy if exists "erp_projects_admin_all" on erp_projects;
create policy "erp_projects_admin_all" on erp_projects
    for all using (auth.role() = 'authenticated');

-- Estimations
drop policy if exists "estimations_admin_all" on estimations;
create policy "estimations_admin_all" on estimations
    for all using (auth.role() = 'authenticated');

-- Estimation Items
drop policy if exists "estimation_items_admin_all" on estimation_items;
create policy "estimation_items_admin_all" on estimation_items
    for all using (auth.role() = 'authenticated');

-- Payment Terms
drop policy if exists "payment_terms_admin_all" on payment_terms;
create policy "payment_terms_admin_all" on payment_terms
    for all using (auth.role() = 'authenticated');

-- ── AUTO UPDATE updated_at ────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists materials_updated_at on materials;
create trigger materials_updated_at
    before update on materials
    for each row execute function update_updated_at();

drop trigger if exists catalogs_updated_at on catalogs;
create trigger catalogs_updated_at
    before update on catalogs
    for each row execute function update_updated_at();

drop trigger if exists erp_projects_updated_at on erp_projects;
create trigger erp_projects_updated_at
    before update on erp_projects
    for each row execute function update_updated_at();

drop trigger if exists estimations_updated_at on estimations;
create trigger estimations_updated_at
    before update on estimations
    for each row execute function update_updated_at();

-- ============================================================
-- SELESAI — Schema berhasil dibuat
-- ============================================================
