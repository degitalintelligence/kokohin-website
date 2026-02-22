DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_addons_qty_m2_consistency'
      AND conrelid = 'public.catalog_addons'::regclass
  ) THEN
    ALTER TABLE public.catalog_addons
      DROP CONSTRAINT catalog_addons_qty_m2_consistency;
  END IF;
END
$$;

ALTER TABLE public.catalog_addons
  DROP COLUMN IF EXISTS qty_per_m2;

