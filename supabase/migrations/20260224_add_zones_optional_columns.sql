-- Add optional columns to zones to match admin UI expectations
-- Columns: description (text), order_index (int), cities (text[]), updated_at (timestamptz)
-- Idempotent: checks existence before adding

-- Add description
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'description'
  ) THEN
    ALTER TABLE zones ADD COLUMN description text;
    COMMENT ON COLUMN zones.description IS 'Internal description/notes for the zone';
  END IF;
END $$;

-- Add order_index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE zones ADD COLUMN order_index int;
    COMMENT ON COLUMN zones.order_index IS 'Display priority; smaller value = higher priority';
  END IF;
END $$;

-- Add cities (list of city/subdistrict names for auto-detection)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'cities'
  ) THEN
    ALTER TABLE zones ADD COLUMN cities text[];
    COMMENT ON COLUMN zones.cities IS 'List of cities/subdistricts matched to this zone';
  END IF;
END $$;

-- Add updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE zones ADD COLUMN updated_at timestamptz DEFAULT now();
    COMMENT ON COLUMN zones.updated_at IS 'Last update timestamp';
  END IF;
END $$;

