-- Migration: 20260226_fix_customer_sync_trigger.sql
-- Fixes the trigger function for syncing leads to customer profiles

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
