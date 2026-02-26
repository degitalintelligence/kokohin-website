-- Migration: 20260226_digital_contract_system.sql
-- Supports dynamic signatories, visual attachments, and tight Quotation-Contract integration

DO $$
BEGIN
    -- 1. Table for Authorized Signatories (e.g., Project Managers, Directors)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_signatories') THEN
        CREATE TABLE public.erp_signatories (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            job_title text NOT NULL,
            signature_url text, -- For digital signature image if needed later
            is_active boolean DEFAULT true,
            created_at timestamptz DEFAULT now()
        );
        
        -- Seed initial signatory
        INSERT INTO public.erp_signatories (name, job_title) 
        VALUES ('Dedi Setiadi', 'Project Manager');
    END IF;

    -- 2. Enhance erp_contracts for dynamic data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_contracts' AND column_name = 'signatory_id') THEN
        ALTER TABLE public.erp_contracts
        ADD COLUMN signatory_id uuid REFERENCES public.erp_signatories(id),
        ADD COLUMN client_ktp text,
        ADD COLUMN attachments jsonb DEFAULT '[]', -- Array of {url: string, type: 'mockup'|'reference'}
        ADD COLUMN scope_snapshot text, -- Full text description of the scope from quotation
        ADD COLUMN payment_terms_json jsonb; -- Dynamic termin calculation override
    END IF;

    -- 3. Enhance erp_quotations/leads for visual attachments from calculator
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'attachments') THEN
        ALTER TABLE public.leads
        ADD COLUMN attachments jsonb DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_quotations' AND column_name = 'attachments') THEN
        ALTER TABLE public.erp_quotations
        ADD COLUMN attachments jsonb DEFAULT '[]';
    END IF;

    -- 3.5. Enhance erp_invoices for visual attachments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_invoices' AND column_name = 'attachments') THEN
        ALTER TABLE public.erp_invoices
        ADD COLUMN attachments jsonb DEFAULT '[]';
    END IF;

    -- 4. Enable RLS
    ALTER TABLE public.erp_signatories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "admins_manage_signatories" ON public.erp_signatories;
    CREATE POLICY "admins_manage_signatories" ON public.erp_signatories FOR ALL USING (auth.role() = 'authenticated');

END $$;
