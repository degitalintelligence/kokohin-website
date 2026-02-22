DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalogs'
      AND column_name = 'labor_cost'
  ) THEN
    ALTER TABLE public.catalogs
      ADD COLUMN labor_cost numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalogs'
      AND column_name = 'transport_cost'
  ) THEN
    ALTER TABLE public.catalogs
      ADD COLUMN transport_cost numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalogs'
      AND column_name = 'margin_percentage'
  ) THEN
    ALTER TABLE public.catalogs
      ADD COLUMN margin_percentage numeric NOT NULL DEFAULT 0;
  END IF;
END
$$;

-- Optional: ensure margin within sane range
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalogs_margin_percentage_check'
      AND conrelid = 'public.catalogs'::regclass
  ) THEN
    ALTER TABLE public.catalogs
      ADD CONSTRAINT catalogs_margin_percentage_check
      CHECK (margin_percentage >= 0 AND margin_percentage <= 100);
  END IF;
END
$$;

