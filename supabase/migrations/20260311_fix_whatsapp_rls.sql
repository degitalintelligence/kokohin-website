-- Migration: Fix WhatsApp RLS Policies
-- Description: Update RLS policies to use security definer function get_user_role() to avoid recursion and permission issues

-- Ensure get_user_role exists and is security definer
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN coalesce(user_role, 'public');
END;
$$;

-- Update policies for all wa_* tables and crm_customers
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (tablename LIKE 'wa_%' OR tablename = 'crm_customers')
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Admin can do everything on %I" ON public.%I;
            CREATE POLICY "Admin can do everything on %I"
            ON public.%I
            FOR ALL
            TO authenticated
            USING (
                public.get_user_role() IN (''super_admin'', ''admin_sales'', ''admin_proyek'')
            )
            WITH CHECK (
                public.get_user_role() IN (''super_admin'', ''admin_sales'', ''admin_proyek'')
            );
        ', table_name, table_name, table_name, table_name, table_name);
    END LOOP;
END $$;
