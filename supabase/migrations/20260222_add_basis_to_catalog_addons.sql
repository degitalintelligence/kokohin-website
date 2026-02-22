DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_addons'
      AND column_name = 'basis'
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD COLUMN basis text NOT NULL DEFAULT 'm2';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_addons'
      AND column_name = 'qty_per_basis'
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD COLUMN qty_per_basis numeric NOT NULL DEFAULT 0;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_addons_basis_check'
      AND conrelid = 'public.catalog_addons'::regclass
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD CONSTRAINT catalog_addons_basis_check
      CHECK (basis IN ('m2','m1','unit'));
  END IF;
END
$$;

-- Backfill: if qty_per_basis is zero but qty_per_m2 exists, copy it and set basis='m2'
UPDATE public.catalog_addons
SET qty_per_basis = COALESCE(qty_per_m2, 0),
    basis = 'm2'
WHERE (qty_per_basis IS NULL OR qty_per_basis = 0)
  AND (qty_per_m2 IS NOT NULL AND qty_per_m2 > 0);

CREATE INDEX IF NOT EXISTS catalog_addons_basis_idx ON public.catalog_addons (basis);

