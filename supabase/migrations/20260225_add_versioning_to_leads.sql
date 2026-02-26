-- Migration: 20260225_add_versioning_to_leads.sql
-- Adds estimation_version and updated_at to leads table

DO $$
BEGIN
    -- 1. Add estimation_version column to leads if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'leads'
          AND column_name  = 'estimation_version'
    ) THEN
        ALTER TABLE public.leads
        ADD COLUMN estimation_version int DEFAULT 1;
        
        COMMENT ON COLUMN public.leads.estimation_version IS
            'Version number of the estimation stored in the lead record';
    END IF;

    -- 2. Add updated_at column to leads if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'leads'
          AND column_name  = 'updated_at'
    ) THEN
        ALTER TABLE public.leads
        ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;
