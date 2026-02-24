-- Pivot to catalog-driven costing: estimation_items supports catalog entries
alter table if exists public.estimation_items
  alter column material_id drop not null;

alter table if exists public.estimation_items
  add column if not exists catalog_id uuid references public.catalogs(id) on delete set null;

alter table if exists public.estimation_items
  add column if not exists description text;

alter table if exists public.estimation_items
  add column if not exists unit text;

create index if not exists estimation_items_catalog_id_idx on public.estimation_items (catalog_id);
