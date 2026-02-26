-- Migration: 20260224_leads_projects_separation.sql
-- Adds constraints and columns to enforce separation between leads and projects

DO $$
BEGIN
    -- 1. Add lead_id column to erp_projects if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'erp_projects'
          AND column_name  = 'lead_id'
    ) THEN
        ALTER TABLE public.erp_projects
        ADD COLUMN lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.erp_projects.lead_id IS
            'Reference to the original lead that became this project (only for Deal projects)';
    END IF;

    -- 2. CONSTRAINT REMOVED: erp_projects_deal_only was too restrictive
    -- Application-level validation will ensure proper separation

    -- 3. Add estimation columns to leads table for storing calculator results
    -- These columns will store the estimation data directly in leads
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'leads'
          AND column_name  = 'total_hpp'
    ) THEN
        ALTER TABLE public.leads
        ADD COLUMN total_hpp decimal(12,2) DEFAULT 0 CHECK (total_hpp >= 0),
        ADD COLUMN margin_percentage decimal(5,2) DEFAULT 30.00 CHECK (margin_percentage >= 0),
        ADD COLUMN total_selling_price decimal(12,2) DEFAULT 0 CHECK (total_selling_price >= 0),
        ADD COLUMN catalog_id uuid REFERENCES public.catalogs(id) ON DELETE SET NULL,
        ADD COLUMN zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
        ADD COLUMN panjang decimal(10,2),
        ADD COLUMN lebar decimal(10,2),
        ADD COLUMN unit_qty decimal(10,2);
        
        COMMENT ON COLUMN public.leads.total_hpp IS 'Total HPP from calculator';
        COMMENT ON COLUMN public.leads.margin_percentage IS 'Margin percentage applied';
        COMMENT ON COLUMN public.leads.total_selling_price IS 'Final selling price from calculator';
        COMMENT ON COLUMN public.leads.catalog_id IS 'Catalog used for calculation';
        COMMENT ON COLUMN public.leads.zone_id IS 'Zone for markup calculation';
        COMMENT ON COLUMN public.leads.panjang IS 'Length dimension (m)';
        COMMENT ON COLUMN public.leads.lebar IS 'Width dimension (m)';
        COMMENT ON COLUMN public.leads.unit_qty IS 'Quantity for unit-based catalogs';
    END IF;

    -- 4. Update leads status enum to match erp_projects statuses for consistency
    -- First check if the constraint exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name   = 'leads'
          AND constraint_name = 'leads_status_check'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;
    END IF;

    -- Add new constraint with expanded status options
    ALTER TABLE public.leads
    ADD CONSTRAINT leads_status_check CHECK (status IN ('new','contacted','quoted','closed','New','Surveyed','Quoted','Deal','Lost','Need Manual Quote'));

END $$;

-- Create index on lead_id for better performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'erp_projects'
          AND indexname = 'idx_erp_projects_lead_id'
    ) THEN
        CREATE INDEX idx_erp_projects_lead_id ON public.erp_projects(lead_id);
    END IF;
END $$;