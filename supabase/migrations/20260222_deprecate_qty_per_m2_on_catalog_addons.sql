DO $$
BEGIN
  UPDATE public.catalog_addons
  SET qty_per_m2 = COALESCE(qty_per_basis, 0)
  WHERE basis = 'm2' AND (qty_per_m2 IS NULL OR qty_per_m2 = 0);

  UPDATE public.catalog_addons
  SET qty_per_m2 = 0
  WHERE basis <> 'm2' AND (qty_per_m2 IS NULL OR qty_per_m2 <> 0);
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_addons_qty_m2_consistency'
      AND conrelid = 'public.catalog_addons'::regclass
  ) THEN
    ALTER TABLE public.catalog_addons
      ADD CONSTRAINT catalog_addons_qty_m2_consistency
      CHECK ((basis = 'm2' AND qty_per_m2 >= 0) OR (basis <> 'm2' AND qty_per_m2 = 0));
  END IF;
END
$$;

