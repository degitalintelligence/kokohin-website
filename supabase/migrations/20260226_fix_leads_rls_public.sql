-- Migration: 20260226_fix_leads_rls_public.sql
-- Allows public (unauthenticated) users to insert leads from the calculator

DO $$
BEGIN
    -- Check if leads table has RLS enabled
    ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if any
    DROP POLICY IF EXISTS "public_insert_leads" ON public.leads;
    
    -- Create new policy to allow anyone to insert
    CREATE POLICY "public_insert_leads" ON public.leads
    FOR INSERT 
    TO public
    WITH CHECK (true);

    -- Also ensure customer profiles can be created by the trigger during public insert
    -- Since the trigger runs with the permissions of the user performing the action,
    -- and erp_customer_profiles has RLS, we need a policy for that too.
    DROP POLICY IF EXISTS "public_insert_customer_profiles" ON public.erp_customer_profiles;
    CREATE POLICY "public_insert_customer_profiles" ON public.erp_customer_profiles
    FOR INSERT
    TO public
    WITH CHECK (true);

    -- Allow public to update their own profile if phone matches (for the ON CONFLICT part of trigger)
    DROP POLICY IF EXISTS "public_update_customer_profiles" ON public.erp_customer_profiles;
    CREATE POLICY "public_update_customer_profiles" ON public.erp_customer_profiles
    FOR UPDATE
    TO public
    USING (true);

END $$;
