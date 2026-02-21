-- Kokohin Mini-ERP — Add is_active columns
-- Migration: 005_add_is_active_columns.sql
-- Adds missing is_active columns to materials and zones tables
-- Run this after 004_fix_rls_recursion.sql

-- ============================================
-- ADD is_active TO MATERIALS
-- ============================================
DO $$ 
BEGIN
    -- Check if column exists before adding
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'materials' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE materials ADD COLUMN is_active boolean DEFAULT true;
        UPDATE materials SET is_active = true WHERE is_active IS NULL;
        COMMENT ON COLUMN materials.is_active IS 'Flag indicating if material is active (can be used in calculations)';
    END IF;
END $$;

-- ============================================
-- ADD is_active TO ZONES
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'zones' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE zones ADD COLUMN is_active boolean DEFAULT true;
        UPDATE zones SET is_active = true WHERE is_active IS NULL;
        COMMENT ON COLUMN zones.is_active IS 'Flag indicating if zone is active (can be selected for projects)';
    END IF;
END $$;

-- ============================================
-- ADD is_active TO CATALOGS (if missing)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'catalogs' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE catalogs ADD COLUMN is_active boolean DEFAULT true;
        UPDATE catalogs SET is_active = true WHERE is_active IS NULL;
        COMMENT ON COLUMN catalogs.is_active IS 'Flag indicating if catalog is active (visible in public catalog)';
    END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_zones_is_active ON zones(is_active);
CREATE INDEX IF NOT EXISTS idx_catalogs_is_active ON catalogs(is_active);

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- This migration adds the missing is_active columns that are referenced
-- in multiple queries throughout the application.
-- 
-- After running this migration:
-- 1. All existing materials, zones, and catalogs will be marked as active (is_active = true)
-- 2. New rows will default to active
-- 3. Application queries filtering by is_active will work correctly
-- 
-- To deactivate a material/zone/catalog, set is_active = false in the admin panel.
