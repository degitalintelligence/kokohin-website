-- Add base_price_unit to catalogs: 'm2' | 'm1' | 'unit'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalogs'
      AND column_name = 'base_price_unit'
  ) THEN
    ALTER TABLE public.catalogs
      ADD COLUMN base_price_unit text NOT NULL DEFAULT 'm2';
  END IF;
END
$$;

-- Add CHECK constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalogs_base_price_unit_check'
      AND conrelid = 'public.catalogs'::regclass
  ) THEN
    ALTER TABLE public.catalogs
      ADD CONSTRAINT catalogs_base_price_unit_check
      CHECK (base_price_unit IN ('m2', 'm1', 'unit'));
  END IF;
END
$$;

