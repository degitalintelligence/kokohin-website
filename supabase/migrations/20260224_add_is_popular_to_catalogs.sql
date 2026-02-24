-- Add is_popular column and index to catalogs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalogs' AND column_name = 'is_popular'
  ) THEN
    ALTER TABLE public.catalogs
      ADD COLUMN is_popular boolean NOT NULL DEFAULT false;
  END IF;
END
$$;

-- Create index for is_popular
CREATE INDEX IF NOT EXISTS idx_catalogs_is_popular ON public.catalogs (is_popular);
