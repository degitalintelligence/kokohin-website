-- Migration: 20260226_quotation_hierarchical_builder.sql
-- Supports hierarchical builder: Quote -> Line Item -> Builder Costs
-- Implements per-line markups and customer-specific minimum prices

DO $$
BEGIN
    -- 1. Create Customer Profiles for Tiered Pricing
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erp_customer_profiles') THEN
        CREATE TABLE public.erp_customer_profiles (
            phone text PRIMARY KEY,
            name text,
            min_price_per_m2 decimal(15,2) DEFAULT 0,
            tier text DEFAULT 'Standard',
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
        
        COMMENT ON TABLE public.erp_customer_profiles IS 'Stores customer-specific pricing constraints and tiers';
    END IF;

    -- 2. Add hierarchical builder columns to erp_quotation_items
    -- Each line item can now have its own builder parameters
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_quotation_items' AND column_name = 'builder_costs') THEN
        ALTER TABLE public.erp_quotation_items
        ADD COLUMN builder_costs jsonb DEFAULT '[]',
        ADD COLUMN catalog_id uuid REFERENCES public.catalogs(id) ON DELETE SET NULL,
        ADD COLUMN zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
        ADD COLUMN panjang decimal(15,2),
        ADD COLUMN lebar decimal(15,2),
        ADD COLUMN unit_qty decimal(15,2),
        ADD COLUMN markup_percentage decimal(5,2) DEFAULT 0,
        ADD COLUMN markup_flat_fee decimal(15,2) DEFAULT 0;

        COMMENT ON COLUMN public.erp_quotation_items.builder_costs IS 'Snapshots of HPP items for this specific line';
        COMMENT ON COLUMN public.erp_quotation_items.markup_percentage IS 'Percentage markup applied to this line';
        COMMENT ON COLUMN public.erp_quotation_items.markup_flat_fee IS 'Flat fee markup (only for Line #1)';
    END IF;

    -- 3. Enable RLS for Customer Profiles
    ALTER TABLE public.erp_customer_profiles ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "admins_manage_customer_profiles" ON public.erp_customer_profiles;
    CREATE POLICY "admins_manage_customer_profiles" ON public.erp_customer_profiles FOR ALL USING (auth.role() = 'authenticated');

END $$;
