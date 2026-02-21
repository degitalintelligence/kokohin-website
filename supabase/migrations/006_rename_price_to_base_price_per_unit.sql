-- Migration 006: Rename price column to base_price_per_unit and add laser cut flags
-- Idempotent migration - safe to run multiple times

DO $$ 
BEGIN
    -- Rename price column to base_price_per_unit if it exists and new column doesn't exist
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name = 'price'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name = 'base_price_per_unit'
    ) THEN
        ALTER TABLE materials RENAME COLUMN price TO base_price_per_unit;
        COMMENT ON COLUMN materials.base_price_per_unit IS 'Harga dasar per unit material (IDR)';
        RAISE NOTICE 'Renamed price column to base_price_per_unit';
    END IF;

    -- Add is_laser_cut column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name = 'is_laser_cut'
    ) THEN
        ALTER TABLE materials ADD COLUMN is_laser_cut boolean DEFAULT false;
        COMMENT ON COLUMN materials.is_laser_cut IS 'Flag indicating if material requires laser cut sheet calculation';
        RAISE NOTICE 'Added is_laser_cut column to materials table';
    END IF;

    -- Add requires_sealant column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name = 'requires_sealant'
    ) THEN
        ALTER TABLE materials ADD COLUMN requires_sealant boolean DEFAULT false;
        COMMENT ON COLUMN materials.requires_sealant IS 'Flag indicating if material requires sealant (e.g., tempered glass)';
        RAISE NOTICE 'Added requires_sealant column to materials table';
    END IF;

    -- Add version_number column to estimations table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'estimations' 
        AND column_name = 'version_number'
    ) THEN
        ALTER TABLE estimations ADD COLUMN version_number integer DEFAULT 1;
        COMMENT ON COLUMN estimations.version_number IS 'Version number of estimation (V1, V2, etc.)';
        RAISE NOTICE 'Added version_number column to estimations table';
    END IF;

    -- Add project_id column to leads table for WA redirect tracking (optional)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN project_id uuid REFERENCES erp_projects(id) ON DELETE SET NULL;
        COMMENT ON COLUMN leads.project_id IS 'Link to erp_projects for WA redirect tracking';
        RAISE NOTICE 'Added project_id column to leads table';
    END IF;

END $$;