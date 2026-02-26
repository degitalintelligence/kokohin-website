-- Migration: 20260225_add_original_selling_price_to_leads.sql
-- Adds original_selling_price column to preserve the initial client estimation value

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'leads'
          AND column_name  = 'original_selling_price'
    ) THEN
        ALTER TABLE public.leads
        ADD COLUMN original_selling_price decimal(12,2) DEFAULT 0 CHECK (original_selling_price >= 0);
        
        COMMENT ON COLUMN public.leads.original_selling_price IS
            'The initial selling price estimated when the lead was created (immutable baseline)';
            
        -- Backfill: For existing leads, copy total_selling_price to original_selling_price
        -- assuming the current total_selling_price is the best proxy for original if not yet edited
        UPDATE public.leads
        SET original_selling_price = total_selling_price
        WHERE original_selling_price IS NULL OR original_selling_price = 0;
    END IF;
END $$;
