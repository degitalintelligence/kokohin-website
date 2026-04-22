-- Material categories become data-driven (no hardcoded enum/check)
-- and materials can be grouped as variants of a parent material.

create table if not exists public.material_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.material_categories (code, name, sort_order, is_active)
values
  ('atap', 'Atap', 10, true),
  ('frame', 'Frame / Rangka', 20, true),
  ('aksesoris', 'Aksesoris', 30, true),
  ('finishing', 'Finishing', 40, true),
  ('isian', 'Isian', 50, true),
  ('lainnya', 'Lainnya', 99, true)
on conflict (code) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

insert into public.material_categories (code, name, sort_order, is_active)
select distinct
  m.category,
  initcap(replace(m.category, '_', ' ')),
  90,
  true
from public.materials m
where m.category is not null
  and btrim(m.category) <> ''
  and not exists (
    select 1
    from public.material_categories c
    where c.code = m.category
  );

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'materials_category_check'
      and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials drop constraint materials_category_check;
  end if;
end $$;

alter table public.materials
  add column if not exists parent_material_id uuid references public.materials(id) on delete set null,
  add column if not exists variant_name text;

update public.materials
set variant_name = coalesce(nullif(btrim(variant_name), ''), 'Default')
where variant_name is null or btrim(variant_name) = '';

alter table public.materials
  alter column variant_name set default 'Default';

alter table public.materials
  alter column variant_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'materials_category_fkey'
      and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials
      add constraint materials_category_fkey
      foreign key (category) references public.material_categories(code)
      on update cascade
      on delete restrict;
  end if;
end $$;

create index if not exists idx_materials_parent_material_id
  on public.materials(parent_material_id);

create index if not exists idx_materials_category
  on public.materials(category);

alter table if exists public.material_categories enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_categories'
      and policyname = 'Authenticated can read material categories'
  ) then
    drop policy "Authenticated can read material categories" on public.material_categories;
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_categories'
      and policyname = 'Admins can manage material categories'
  ) then
    drop policy "Admins can manage material categories" on public.material_categories;
  end if;
end $$;

create policy "Authenticated can read material categories"
  on public.material_categories for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage material categories"
  on public.material_categories for all
  using (public.get_user_role() in ('super_admin', 'admin_sales', 'admin_proyek'));
