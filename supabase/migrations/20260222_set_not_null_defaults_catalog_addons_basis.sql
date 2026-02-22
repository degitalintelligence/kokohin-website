UPDATE public.catalog_addons
SET basis = 'm2'
WHERE basis IS NULL;

UPDATE public.catalog_addons
SET qty_per_basis = 0
WHERE qty_per_basis IS NULL;

ALTER TABLE public.catalog_addons
  ALTER COLUMN basis SET DEFAULT 'm2',
  ALTER COLUMN qty_per_basis SET DEFAULT 0;

ALTER TABLE public.catalog_addons
  ALTER COLUMN basis SET NOT NULL,
  ALTER COLUMN qty_per_basis SET NOT NULL;

