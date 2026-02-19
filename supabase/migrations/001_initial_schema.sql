-- Kokohin Website — Initial Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- SERVICES
-- ============================================
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  short_desc  text,
  description text,
  icon        text,          -- emoji or icon name
  image_url   text,
  "order"     int default 0,
  created_at  timestamptz default now()
);

-- ============================================
-- PROJECTS / GALLERY
-- ============================================
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  service_id  uuid references services(id) on delete set null,
  images      jsonb default '[]',   -- array of image URLs
  location    text,
  year        int,
  featured    boolean default false,
  created_at  timestamptz default now()
);

-- ============================================
-- TESTIMONIALS
-- ============================================
create table if not exists testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text,
  content     text not null,
  rating      int default 5 check (rating between 1 and 5),
  avatar_url  text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================
-- LEADS (from contact/quote form)
-- ============================================
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  email       text,
  location    text not null,
  service_id  uuid references services(id) on delete set null,
  message     text,
  status      text default 'new' check (status in ('new','contacted','quoted','closed')),
  created_at  timestamptz default now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
alter table services     enable row level security;
alter table projects     enable row level security;
alter table testimonials enable row level security;
alter table leads        enable row level security;

-- Public can READ services, projects, testimonials
create policy "public_read_services"     on services     for select using (true);
create policy "public_read_projects"     on projects     for select using (true);
create policy "public_read_testimonials" on testimonials for select using (active = true);

-- Public can INSERT leads (contact form)
create policy "public_insert_leads"      on leads        for insert with check (true);

-- Authenticated users (admin) have full access
create policy "admin_all_services"     on services     for all using (auth.role() = 'authenticated');
create policy "admin_all_projects"     on projects     for all using (auth.role() = 'authenticated');
create policy "admin_all_testimonials" on testimonials for all using (auth.role() = 'authenticated');
create policy "admin_all_leads"        on leads        for all using (auth.role() = 'authenticated');

-- ============================================
-- SEED DATA — Layanan Kanopi
-- ============================================
insert into services (name, slug, short_desc, description, icon, "order") values
  ('Kanopi Baja Ringan',   'baja-ringan',   'Material kuat, ringan, dan tahan lama untuk hunian modern.', 'Kanopi berbahan rangka baja ringan (galvalum) dengan penutup berbagai pilihan material. Cocok untuk carport, teras, dan area parkir.', '🏗️', 1),
  ('Kanopi Polycarbonate', 'polycarbonate', 'Anti-UV, tembus cahaya, dan estetis untuk tampilan modern.', 'Menggunakan lembaran polycarbonate berkualitas tinggi yang dapat meneruskan cahaya alami sekaligus memblokir sinar UV berbahaya.', '✨', 2),
  ('Kanopi Kaca',          'kaca',          'Elegan dan premium untuk area komersial dan rumah mewah.', 'Kanopi kaca tempered yang memberikan kesan mewah dan modern. Tersedia dalam berbagai ketebalan dan pilihan kaca.', '🪟', 3),
  ('Kanopi Spandek',       'spandek',       'Harga terjangkau dengan ketahanan terhadap panas dan hujan.', 'Menggunakan atap spandek warna yang ringan, mudah dipasang, dan cocok untuk berbagai kebutuhan rumah tangga.', '🔩', 4),
  ('Kanopi Membrane',      'membrane',      'Desain artistik dan fleksibel untuk area outdoor modern.', 'Membrane kanopi dengan desain tensile yang unik, cocok untuk area komersial, café outdoor, dan ruang publik.', '🎪', 5),
  ('Pergola & Carport',    'pergola',       'Struktur outdoor elegan untuk taman dan area parkir.', 'Desain pergola dan carport kustom berbahan besi tempa, kayu, atau aluminium untuk menambah nilai estetika properti Anda.', '🏡', 6)
on conflict (slug) do nothing;

-- Seed testimonials
insert into testimonials (name, company, content, rating) values
  ('Budi Santoso',    'Perumahan Griya Asri',    'Hasil pemasangan kanopi sangat rapih dan profesional. Tim Kokohin bekerja cepat dan hasilnya memuaskan!', 5),
  ('Siti Rahayu',     null,                      'Saya pesan kanopi polycarbonate untuk teras rumah. Kualitasnya bagus dan harganya sesuai budget. Recommended!', 5),
  ('Ahmad Fauzi',     'Toko Bangunan Maju Jaya', 'Sudah 3 kali pakai jasa Kokohin untuk proyek kanopi. Selalu puas dengan hasilnya. Garansi juga ditepati!', 5),
  ('Dewi Kusuma',     null,                      'Pelayanannya ramah, survei gratis, dan pemasangannya bersih. Tidak mengecewakan sama sekali.',                  4),
  ('Hendra Wijaya',   'CV. Sukses Mandiri',      'Kanopi kaca untuk showroom kami terpasang dengan sempurna. Tampilannya mewah dan elegan. Terima kasih Kokohin!', 5)
on conflict do nothing;
