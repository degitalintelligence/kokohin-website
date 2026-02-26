-- Migration: 004_add_finishing_to_catalogs.sql

-- 1. Update materials category check constraint
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'materials_category_check') THEN
        ALTER TABLE materials DROP CONSTRAINT materials_category_check;
    END IF;
    -- Drop old one if named differently (common in some setups)
    ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_category_check1;
    
    ALTER TABLE materials ADD CONSTRAINT materials_category_check CHECK (category IN ('atap', 'frame', 'aksesoris', 'finishing', 'isian', 'lainnya'));
END $$;

-- 2. Add new columns to catalogs
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS finishing_id uuid REFERENCES materials(id) ON DELETE RESTRICT;
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS isian_id uuid REFERENCES materials(id) ON DELETE RESTRICT;
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('kanopi', 'pagar', 'railing', 'aksesoris', 'lainnya'));

-- 2.1 Add snapshot columns to erp_quotation_items for better data integrity
ALTER TABLE erp_quotation_items ADD COLUMN IF NOT EXISTS finishing_id uuid REFERENCES materials(id) ON DELETE SET NULL;
ALTER TABLE erp_quotation_items ADD COLUMN IF NOT EXISTS isian_id uuid REFERENCES materials(id) ON DELETE SET NULL;
ALTER TABLE erp_quotation_items ADD COLUMN IF NOT EXISTS atap_id uuid REFERENCES materials(id) ON DELETE SET NULL;
ALTER TABLE erp_quotation_items ADD COLUMN IF NOT EXISTS rangka_id uuid REFERENCES materials(id) ON DELETE SET NULL;

-- 3. Seed data for Finishing and Isian
INSERT INTO materials (code, name, category, unit, base_price_per_unit, length_per_unit, is_active) VALUES
  ('FIN-PC-01', 'Powder Coating', 'finishing', 'm2', 150000, 1, true),
  ('FIN-DUCO-01', 'Cat Duco', 'finishing', 'm2', 120000, 1, true),
  ('FIN-SS-01', 'Stainless Steel Polish', 'finishing', 'm2', 250000, 1, true),
  ('FIN-GALV-01', 'Hot Dip Galvanize', 'finishing', 'm2', 200000, 1, true),
  ('ISIAN-HW-01', 'Besi Hollow', 'isian', 'm2', 180000, 1, true),
  ('ISIAN-TMP-01', 'Besi Tempa', 'isian', 'm2', 350000, 1, true),
  ('ISIAN-ALU-01', 'Aluminium', 'isian', 'm2', 250000, 1, true)
ON CONFLICT (code) DO NOTHING;

-- 4. Trigger for validation: prevent 'lainnya' category in catalogs without valid finishing
CREATE OR REPLACE FUNCTION validate_catalog_finishing()
RETURNS TRIGGER AS $$
BEGIN
    -- If category is not 'aksesoris' and not 'lainnya', finishing_id is mandatory
    IF NEW.category NOT IN ('aksesoris', 'lainnya') AND NEW.finishing_id IS NULL THEN
        RAISE EXCEPTION 'Produk kategori % wajib memiliki nilai Finishing yang valid.', NEW.category;
    END IF;
    
    -- Special rule: category 'lainnya' must still have a title or description that isn't empty,
    -- but if it's used as a catch-all for structural items, we might want to enforce finishing too.
    -- For now, let's enforce finishing for EVERYTHING except 'aksesoris'.
    IF NEW.category = 'lainnya' AND NEW.finishing_id IS NULL THEN
         RAISE EXCEPTION 'Item kategori "Lainnya" wajib memiliki nilai Finishing untuk mencegah miss-spect.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_catalog_finishing ON catalogs;
CREATE TRIGGER trg_validate_catalog_finishing
BEFORE INSERT OR UPDATE ON catalogs
FOR EACH ROW EXECUTE FUNCTION validate_catalog_finishing();

