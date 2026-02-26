-- Migration: 20260226_customer_and_payment_terms.sql
-- Supports automated customer profiles and scalable payment terms management

DO $$
BEGIN
    -- 1. Scalable Payment Terms Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_payment_terms') THEN
        CREATE TABLE public.erp_payment_terms (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            description text,
            terms_json jsonb NOT NULL, -- e.g., [{"percent": 50, "label": "DP"}, {"percent": 40, "label": "Fabrikasi"}, {"percent": 10, "label": "Pelunasan"}]
            is_active boolean DEFAULT true,
            created_at timestamptz DEFAULT now()
        );
        
        -- Seed default 50-40-10
        INSERT INTO public.erp_payment_terms (name, description, terms_json)
        VALUES ('Standard 50-40-10', 'DP 50%, Fabrikasi 40%, Pelunasan 10%', '[{"percent": 50, "label": "DP 50%"}, {"percent": 40, "label": "Fabrikasi 40%"}, {"percent": 10, "label": "Pelunasan 10%"}]');
    END IF;

    -- 2. Update erp_customer_profiles to be more comprehensive
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_customer_profiles' AND column_name = 'ktp_number') THEN
        ALTER TABLE public.erp_customer_profiles
        ADD COLUMN ktp_number text,
        ADD COLUMN address text,
        ADD COLUMN email text,
        ADD COLUMN lead_id uuid REFERENCES public.leads(id);
    END IF;

    -- 3. Update Quotations to link to Payment Terms
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_quotations' AND column_name = 'payment_term_id') THEN
        ALTER TABLE public.erp_quotations
        ADD COLUMN payment_term_id uuid REFERENCES public.erp_payment_terms(id);
    END IF;

END $$;

-- 4. Trigger to automatically create/update customer profile when lead is saved
CREATE OR REPLACE FUNCTION public.sync_lead_to_customer_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.erp_customer_profiles (name, phone, lead_id)
    VALUES (NEW.name, NEW.phone, NEW.id)
    ON CONFLICT (phone) DO UPDATE 
    SET name = EXCLUDED.name, lead_id = EXCLUDED.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_lead_customer ON public.leads;
CREATE TRIGGER trg_sync_lead_customer
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_to_customer_profile();
