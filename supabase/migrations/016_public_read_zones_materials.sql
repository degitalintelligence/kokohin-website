-- Migration: 016_public_read_zones_materials.sql
-- Allow public read access for active zones and materials needed by public calculator
-- Safe-guard with IF NOT EXISTS to avoid duplication

-- Public can read active zones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'zones'
      AND policyname = 'Public can read active zones'
  ) THEN
    CREATE POLICY "Public can read active zones" ON zones
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Public can read active materials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'materials'
      AND policyname = 'Public can read active materials'
  ) THEN
    CREATE POLICY "Public can read active materials" ON materials
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Notes:
-- - Catalogs already have a public read policy for is_active = true
-- - This aligns public calculator data needs with RLS policies
-- - Apply this migration with: supabase db push / migration runner of your choice
