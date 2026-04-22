DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'catalog_categories'
  ) THEN
    CREATE TABLE public.catalog_categories (
      code text PRIMARY KEY,
      name text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      require_atap boolean NOT NULL DEFAULT false,
      require_rangka boolean NOT NULL DEFAULT false,
      require_isian boolean NOT NULL DEFAULT false,
      require_finishing boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

INSERT INTO public.catalog_categories (
  code,
  name,
  sort_order,
  is_active,
  require_atap,
  require_rangka,
  require_isian,
  require_finishing
)
VALUES
  ('kanopi', 'Kanopi', 10, true, true, true, false, true),
  ('pagar', 'Pagar', 20, true, false, true, true, true),
  ('railing', 'Railing', 30, true, false, true, true, true),
  ('aksesoris', 'Aksesoris', 40, true, false, false, false, false),
  ('lainnya', 'Lainnya', 50, true, false, false, false, false)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  require_atap = EXCLUDED.require_atap,
  require_rangka = EXCLUDED.require_rangka,
  require_isian = EXCLUDED.require_isian,
  require_finishing = EXCLUDED.require_finishing;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalogs_category_check'
      AND conrelid = 'public.catalogs'::regclass
  ) THEN
    ALTER TABLE public.catalogs
      DROP CONSTRAINT catalogs_category_check;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalogs_category_check1'
      AND conrelid = 'public.catalogs'::regclass
  ) THEN
    ALTER TABLE public.catalogs
      DROP CONSTRAINT catalogs_category_check1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalogs_category_fkey'
      AND conrelid = 'public.catalogs'::regclass
  ) THEN
    ALTER TABLE public.catalogs
      ADD CONSTRAINT catalogs_category_fkey
      FOREIGN KEY (category)
      REFERENCES public.catalog_categories(code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'catalog_category_hpp_sections'
  ) THEN
    CREATE TABLE public.catalog_category_hpp_sections (
      category_code text NOT NULL,
      section_code text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (category_code, section_code),
      CONSTRAINT catalog_category_hpp_sections_category_fkey
        FOREIGN KEY (category_code)
        REFERENCES public.catalog_categories(code)
        ON DELETE CASCADE,
      CONSTRAINT catalog_category_hpp_sections_section_fkey
        FOREIGN KEY (section_code)
        REFERENCES public.catalog_hpp_sections(code)
        ON DELETE CASCADE
    );
  END IF;
END $$;

INSERT INTO public.catalog_category_hpp_sections (category_code, section_code, sort_order, is_active)
VALUES
  ('kanopi', 'atap', 10, true),
  ('kanopi', 'rangka', 20, true),
  ('kanopi', 'finishing', 30, true),
  ('kanopi', 'aksesoris', 40, true),
  ('kanopi', 'lainnya', 50, true),
  ('pagar', 'rangka', 10, true),
  ('pagar', 'isian', 20, true),
  ('pagar', 'finishing', 30, true),
  ('pagar', 'aksesoris', 40, true),
  ('pagar', 'lainnya', 50, true),
  ('railing', 'rangka', 10, true),
  ('railing', 'isian', 20, true),
  ('railing', 'finishing', 30, true),
  ('railing', 'aksesoris', 40, true),
  ('railing', 'lainnya', 50, true),
  ('aksesoris', 'aksesoris', 10, true),
  ('aksesoris', 'lainnya', 20, true),
  ('lainnya', 'lainnya', 10, true)
ON CONFLICT (category_code, section_code) DO UPDATE
SET
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
