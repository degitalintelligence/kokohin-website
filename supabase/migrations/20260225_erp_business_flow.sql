-- Migration: 20260225_erp_business_flow.sql
-- Implements the structured ERP flow: Estimasi -> Penawaran -> Kontrak -> Invoice -> Pembayaran

DO $$
BEGIN
    -- 1. Create Quotations (Penawaran) table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_quotations') THEN
        CREATE TABLE public.erp_quotations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            estimation_id uuid NOT NULL REFERENCES public.estimations(id) ON DELETE CASCADE,
            lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
            project_id uuid REFERENCES public.erp_projects(id) ON DELETE SET NULL,
            quotation_number text UNIQUE NOT NULL,
            total_amount decimal(15,2) NOT NULL DEFAULT 0,
            status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
            valid_until timestamptz,
            notes text,
            created_by uuid REFERENCES auth.users(id),
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;

    -- 2. Create Contracts (Kontrak) table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_contracts') THEN
        CREATE TABLE public.erp_contracts (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            quotation_id uuid NOT NULL REFERENCES public.erp_quotations(id) ON DELETE RESTRICT,
            contract_number text UNIQUE NOT NULL,
            signed_date date,
            start_date date,
            end_date date,
            total_value decimal(15,2) NOT NULL,
            status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'disputed')),
            terms_and_conditions text,
            document_url text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;

    -- 3. Create Invoices (Invoice) table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_invoices') THEN
        CREATE TABLE public.erp_invoices (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            contract_id uuid NOT NULL REFERENCES public.erp_contracts(id) ON DELETE RESTRICT,
            invoice_number text UNIQUE NOT NULL,
            due_date date NOT NULL,
            total_amount decimal(15,2) NOT NULL,
            amount_paid decimal(15,2) NOT NULL DEFAULT 0,
            status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled')),
            notes text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;

    -- 4. Create Payments (Pembayaran) table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_payments') THEN
        CREATE TABLE public.erp_payments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id uuid NOT NULL REFERENCES public.erp_invoices(id) ON DELETE RESTRICT,
            payment_date timestamptz NOT NULL DEFAULT now(),
            amount decimal(15,2) NOT NULL CHECK (amount > 0),
            payment_method text NOT NULL CHECK (payment_method IN ('transfer', 'cash', 'credit_card', 'other')),
            reference_number text,
            status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
            proof_url text,
            created_at timestamptz DEFAULT now()
        );
    END IF;

    -- 5. Create Audit Trail table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_audit_trail') THEN
        CREATE TABLE public.erp_audit_trail (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id),
            entity_type text NOT NULL,
            entity_id uuid NOT NULL,
            action_type text NOT NULL,
            old_value jsonb,
            new_value jsonb,
            timestamp timestamptz DEFAULT now()
        );
    END IF;

    -- 6. Enable RLS
    ALTER TABLE public.erp_quotations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.erp_contracts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.erp_invoices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.erp_payments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.erp_audit_trail ENABLE ROW LEVEL SECURITY;

END $$;

-- 7. Policies (outside DO block to avoid syntax issues with nested loops if not careful)
DROP POLICY IF EXISTS "admins_manage_erp_quotations" ON public.erp_quotations;
CREATE POLICY "admins_manage_erp_quotations" ON public.erp_quotations FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_manage_erp_contracts" ON public.erp_contracts;
CREATE POLICY "admins_manage_erp_contracts" ON public.erp_contracts FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_manage_erp_invoices" ON public.erp_invoices;
CREATE POLICY "admins_manage_erp_invoices" ON public.erp_invoices FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_manage_erp_payments" ON public.erp_payments;
CREATE POLICY "admins_manage_erp_payments" ON public.erp_payments FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_manage_erp_audit_trail" ON public.erp_audit_trail;
CREATE POLICY "admins_manage_erp_audit_trail" ON public.erp_audit_trail FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotations_estimation_id ON public.erp_quotations(estimation_id);
CREATE INDEX IF NOT EXISTS idx_contracts_quotation_id ON public.erp_contracts(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON public.erp_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.erp_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.erp_audit_trail(entity_type, entity_id);
