
-- Simplified migration without DO block to avoid split issues
ALTER TABLE public.erp_payment_terms ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Set "Standard 50-40-10" as default if it exists
UPDATE public.erp_payment_terms 
SET is_default = TRUE 
WHERE name = 'Standard 50-40-10';
