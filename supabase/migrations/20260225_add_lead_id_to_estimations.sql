-- Migration: 20260225_add_lead_id_to_estimations.sql
-- Adds lead_id to estimations table for history snapshots

DO $$
BEGIN
    -- 1. Add lead_id column to estimations if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'estimations'
          AND column_name  = 'lead_id'
    ) THEN
        ALTER TABLE public.estimations
        ADD COLUMN lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE;
        
        COMMENT ON COLUMN public.estimations.lead_id IS
            'Reference to the lead this estimation belongs to (for history snapshots)';
    END IF;

    -- 2. Make project_id nullable if lead_id is present
    -- In older migrations it was not null, so we drop the not null constraint
    ALTER TABLE public.estimations
    ALTER COLUMN project_id DROP NOT NULL;

    -- 3. Add constraint to ensure either project_id or lead_id is present
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name   = 'estimations'
          AND constraint_name = 'estimations_target_check'
    ) THEN
        ALTER TABLE public.estimations
        ADD CONSTRAINT estimations_target_check 
        CHECK (project_id IS NOT NULL OR lead_id IS NOT NULL);
    END IF;

    -- 4. Fix unique constraint: project_id + version_number 
    -- We need a separate one for lead_id + version_number
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name   = 'estimations'
          AND constraint_name = 'estimations_project_id_version_number_key'
    ) THEN
        ALTER TABLE public.estimations DROP CONSTRAINT estimations_project_id_version_number_key;
    END IF;

    -- Add composite unique constraints
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estimations_project_version_unique') THEN
        CREATE UNIQUE INDEX idx_estimations_project_version_unique ON public.estimations(project_id, version_number) WHERE project_id IS NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estimations_lead_version_unique') THEN
        CREATE UNIQUE INDEX idx_estimations_lead_version_unique ON public.estimations(lead_id, version_number) WHERE lead_id IS NOT NULL;
    END IF;

END $$;
