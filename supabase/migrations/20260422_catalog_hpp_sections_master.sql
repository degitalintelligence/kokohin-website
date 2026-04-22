DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'catalog_hpp_sections'
  ) THEN
    CREATE TABLE public.catalog_hpp_sections (
      code text PRIMARY KEY,
      name text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

INSERT INTO public.catalog_hpp_sections (code, name, sort_order, is_active)
VALUES
  ('atap', 'Atap', 10, true),
  ('rangka', 'Rangka', 20, true),
  ('isian', 'Isian', 30, true),
  ('finishing', 'Finishing', 40, true),
  ('aksesoris', 'Aksesoris', 50, true),
  ('lainnya', 'Lainnya', 60, true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_hpp_components_section_check'
      AND conrelid = 'public.catalog_hpp_components'::regclass
  ) THEN
    ALTER TABLE public.catalog_hpp_components
      DROP CONSTRAINT catalog_hpp_components_section_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_hpp_components_section_fkey'
      AND conrelid = 'public.catalog_hpp_components'::regclass
  ) THEN
    ALTER TABLE public.catalog_hpp_components
      ADD CONSTRAINT catalog_hpp_components_section_fkey
      FOREIGN KEY (section)
      REFERENCES public.catalog_hpp_sections(code);
  END IF;
END $$;
