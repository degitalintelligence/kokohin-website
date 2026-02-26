
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'catalog_hpp_components'
          AND column_name  = 'section'
    ) THEN
        ALTER TABLE public.catalog_hpp_components
        ADD COLUMN section text DEFAULT 'lainnya';

        COMMENT ON COLUMN public.catalog_hpp_components.section IS
            'Bagian/Segmen komponen dalam HPP (atap, rangka, isian, finishing, aksesoris, lainnya)';
    END IF;

    -- Add check constraint for valid sections
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'catalog_hpp_components_section_check'
          AND conrelid = 'public.catalog_hpp_components'::regclass
    ) THEN
        ALTER TABLE public.catalog_hpp_components
        ADD CONSTRAINT catalog_hpp_components_section_check
        CHECK (section IN ('atap', 'rangka', 'isian', 'finishing', 'aksesoris', 'lainnya'));
    END IF;
END $$;
