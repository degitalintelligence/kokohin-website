-- Migration: 20260304_fix_customer_quote_relations_and_delete_constraints.sql
-- Fixes customer-profile relation direction, address sync consistency, and delete constraints

DO $$
DECLARE
    fk_name text;
BEGIN
    -- Ensure lead_id exists on customer profile
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'erp_customer_profiles'
          AND column_name = 'lead_id'
    ) THEN
        ALTER TABLE public.erp_customer_profiles
        ADD COLUMN lead_id uuid;
    END IF;

    -- Replace existing FK on lead_id to use ON DELETE SET NULL
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'erp_customer_profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'lead_id'
      AND ccu.table_name = 'leads'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.erp_customer_profiles DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE public.erp_customer_profiles
    ADD CONSTRAINT erp_customer_profiles_lead_id_fkey
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE SET NULL;

    -- Keep one profile per lead (customer can still have many quotations through lead_id in quotations)
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'erp_customer_profiles_lead_id_unique'
    ) THEN
        ALTER TABLE public.erp_customer_profiles
        ADD CONSTRAINT erp_customer_profiles_lead_id_unique UNIQUE (lead_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_erp_quotations_lead_id ON public.erp_quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_erp_customer_profiles_lead_id ON public.erp_customer_profiles(lead_id);

CREATE OR REPLACE FUNCTION public.sync_lead_to_customer_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
    INSERT INTO public.erp_customer_profiles (name, phone, lead_id, address)
    VALUES (
        NEW.name,
        NEW.phone,
        NEW.id,
        NULLIF(BTRIM(NEW.location), '')
    )
    ON CONFLICT (phone) DO UPDATE
    SET
        name = EXCLUDED.name,
        lead_id = COALESCE(public.erp_customer_profiles.lead_id, EXCLUDED.lead_id),
        address = CASE
            WHEN COALESCE(NULLIF(BTRIM(public.erp_customer_profiles.address), ''), '') = ''
                THEN EXCLUDED.address
            ELSE public.erp_customer_profiles.address
        END,
        updated_at = now();

    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;
