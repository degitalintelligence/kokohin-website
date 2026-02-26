-- Migration: 20260225_independent_erp_items.sql
-- Implements strict data separation between Cost Builder, Quotations, Contracts, and Invoices

DO $$
BEGIN
    -- 1. Estimation Items (Cost Builder Snapshots)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_estimation_items') THEN
        CREATE TABLE public.erp_estimation_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            estimation_id uuid NOT NULL REFERENCES public.estimations(id) ON DELETE CASCADE,
            name text NOT NULL,
            unit text,
            quantity decimal(15,2) NOT NULL DEFAULT 0,
            unit_price decimal(15,2) NOT NULL DEFAULT 0,
            subtotal decimal(15,2) NOT NULL DEFAULT 0,
            type text, -- 'material', 'labor', 'overhead', 'global', etc.
            created_at timestamptz DEFAULT now()
        );
    END IF;

    -- 2. Quotation Items
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_quotation_items') THEN
        CREATE TABLE public.erp_quotation_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            quotation_id uuid NOT NULL REFERENCES public.erp_quotations(id) ON DELETE CASCADE,
            name text NOT NULL,
            unit text,
            quantity decimal(15,2) NOT NULL DEFAULT 0,
            unit_price decimal(15,2) NOT NULL DEFAULT 0,
            subtotal decimal(15,2) NOT NULL DEFAULT 0,
            type text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;

    -- 3. Contract Items
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_contract_items') THEN
        CREATE TABLE public.erp_contract_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            contract_id uuid NOT NULL REFERENCES public.erp_contracts(id) ON DELETE CASCADE,
            name text NOT NULL,
            unit text,
            quantity decimal(15,2) NOT NULL DEFAULT 0,
            unit_price decimal(15,2) NOT NULL DEFAULT 0,
            subtotal decimal(15,2) NOT NULL DEFAULT 0,
            type text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;

    -- 4. Invoice Items
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_invoice_items') THEN
        CREATE TABLE public.erp_invoice_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id uuid NOT NULL REFERENCES public.erp_invoices(id) ON DELETE CASCADE,
            name text NOT NULL,
            unit text,
            quantity decimal(15,2) NOT NULL DEFAULT 0,
            unit_price decimal(15,2) NOT NULL DEFAULT 0,
            subtotal decimal(15,2) NOT NULL DEFAULT 0,
            type text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;

    -- 5. Enable RLS and Policies
    ALTER TABLE public.erp_estimation_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.erp_quotation_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.erp_contract_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.erp_invoice_items ENABLE ROW LEVEL SECURITY;

END $$;

-- Policies
DROP POLICY IF EXISTS "admins_manage_erp_estimation_items" ON public.erp_estimation_items;
CREATE POLICY "admins_manage_erp_estimation_items" ON public.erp_estimation_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_manage_erp_quotation_items" ON public.erp_quotation_items;
CREATE POLICY "admins_manage_erp_quotation_items" ON public.erp_quotation_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_manage_erp_contract_items" ON public.erp_contract_items;
CREATE POLICY "admins_manage_erp_contract_items" ON public.erp_contract_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins_manage_erp_invoice_items" ON public.erp_invoice_items;
CREATE POLICY "admins_manage_erp_invoice_items" ON public.erp_invoice_items FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_est_items_est_id ON public.erp_estimation_items(estimation_id);
CREATE INDEX IF NOT EXISTS idx_qtn_items_qtn_id ON public.erp_quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_ctr_items_ctr_id ON public.erp_contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_inv_id ON public.erp_invoice_items(invoice_id);
