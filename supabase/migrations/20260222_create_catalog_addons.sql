CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.catalog_addons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_id uuid NOT NULL,
  material_id uuid NOT NULL,
  qty_per_m2 numeric NOT NULL DEFAULT 0,
  is_optional boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_addons_catalog_id_fkey'
      AND conrelid = 'public.catalog_addons'::regclass
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD CONSTRAINT catalog_addons_catalog_id_fkey
      FOREIGN KEY (catalog_id) REFERENCES public.catalogs (id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_addons_material_id_fkey'
      AND conrelid = 'public.catalog_addons'::regclass
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD CONSTRAINT catalog_addons_material_id_fkey
      FOREIGN KEY (material_id) REFERENCES public.materials (id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_addons_unique_catalog_material'
      AND conrelid = 'public.catalog_addons'::regclass
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD CONSTRAINT catalog_addons_unique_catalog_material
      UNIQUE (catalog_id, material_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS catalog_addons_catalog_id_idx ON public.catalog_addons (catalog_id);
CREATE INDEX IF NOT EXISTS catalog_addons_material_id_idx ON public.catalog_addons (material_id);
