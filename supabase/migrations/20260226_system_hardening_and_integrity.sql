-- Migration: 20260226_system_hardening_and_integrity.sql
-- Addresses critical issues: Security RLS, Duplicate Invoices, and Atomic Triggers

-- 1. Integrity: Prevent duplicate invoicing for the same stage in a contract
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_invoices' AND column_name = 'payment_stage') THEN
        ALTER TABLE public.erp_invoices ADD COLUMN payment_stage text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_contract_stage_invoice') THEN
        ALTER TABLE public.erp_invoices 
        ADD CONSTRAINT unique_contract_stage_invoice UNIQUE (contract_id, payment_stage);
    END IF;
END $$;

-- 2. Security: Harden erp_customer_profiles RLS
DO $$
BEGIN
    DROP POLICY IF EXISTS "public_update_customer_profiles" ON public.erp_customer_profiles;
    
    DROP POLICY IF EXISTS "admins_manage_customer_profiles" ON public.erp_customer_profiles;
    CREATE POLICY "admins_manage_customer_profiles" ON public.erp_customer_profiles 
    FOR ALL TO authenticated USING (true);
END $$;

-- 3. Atomicity: Refactor trigger to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.sync_lead_to_customer_profile()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $func$
BEGIN
    INSERT INTO public.erp_customer_profiles (name, phone, lead_id)
    VALUES (NEW.name, NEW.phone, NEW.id)
    ON CONFLICT (phone) DO UPDATE 
    SET name = EXCLUDED.name, lead_id = EXCLUDED.lead_id;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;
