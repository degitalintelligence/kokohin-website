DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'catalogs'
          AND column_name  = 'hpp_per_unit'
    ) THEN
        ALTER TABLE public.catalogs
        ADD COLUMN hpp_per_unit numeric;

        COMMENT ON COLUMN public.catalogs.hpp_per_unit IS
            'Total HPP per unit katalog (IDR), dihitung otomatis dari formulasi HPP';
    END IF;
END $$;

