-- Migration: Add 'category' column to 'catalogs' table (idempotent)
-- Applies to: Supabase Postgres (self-hosted)
-- Categories allowed: kanopi, pagar, railing, aksesoris, lainnya

DO $$
BEGIN
  -- 1) Add column if it does not exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalogs'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.catalogs
      ADD COLUMN category text;
  END IF;

  -- 2) Backfill NULLs to default value 'kanopi'
  UPDATE public.catalogs
    SET category = 'kanopi'
    WHERE category IS NULL;

  -- 3) Add CHECK constraint to restrict values (create if not exists)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalogs_category_check'
      AND conrelid = 'public.catalogs'::regclass
  ) THEN
    ALTER TABLE public.catalogs
      ADD CONSTRAINT catalogs_category_check
      CHECK (category IN ('kanopi', 'pagar', 'railing', 'aksesoris', 'lainnya'));
  END IF;

  -- 4) Set NOT NULL and DEFAULT
  ALTER TABLE public.catalogs
    ALTER COLUMN category SET DEFAULT 'kanopi',
    ALTER COLUMN category SET NOT NULL;

  -- 5) Create index for category if not exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'catalogs'
      AND indexname = 'catalogs_category_idx'
  ) THEN
    CREATE INDEX catalogs_category_idx ON public.catalogs (category);
  END IF;
END
$$;

