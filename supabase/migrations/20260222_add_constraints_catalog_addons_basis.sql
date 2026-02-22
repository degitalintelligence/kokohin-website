DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'catalog_addons_basis_valid'
      AND conrelid = 'public.catalog_addons'::regclass
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD CONSTRAINT catalog_addons_basis_valid
      CHECK (basis IN ('m2','m1','unit'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'catalog_addons_qty_per_basis_nonneg'
      AND conrelid = 'public.catalog_addons'::regclass
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD CONSTRAINT catalog_addons_qty_per_basis_nonneg
      CHECK (qty_per_basis >= 0);
  END IF;
END
$$;

