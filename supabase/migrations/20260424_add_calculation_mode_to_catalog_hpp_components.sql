DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_hpp_components'
      AND column_name = 'calculation_mode'
  ) THEN
    ALTER TABLE public.catalog_hpp_components
      ADD COLUMN calculation_mode text NOT NULL DEFAULT 'variable';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_hpp_components_calculation_mode_check'
      AND conrelid = 'public.catalog_hpp_components'::regclass
  ) THEN
    ALTER TABLE public.catalog_hpp_components
      DROP CONSTRAINT catalog_hpp_components_calculation_mode_check;
  END IF;

  ALTER TABLE public.catalog_hpp_components
    ADD CONSTRAINT catalog_hpp_components_calculation_mode_check
    CHECK (calculation_mode IN ('variable', 'fixed'));
END $$;

UPDATE public.catalog_hpp_components
SET calculation_mode = 'variable'
WHERE calculation_mode IS NULL;
