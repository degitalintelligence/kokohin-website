-- Migration: 20260304_add_versioning_to_quotations.sql
-- Adds versioning support to erp_quotations table

ALTER TABLE public.erp_quotations 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.erp_quotations(id) ON DELETE SET NULL;

-- Add index for faster lookup of revisions
CREATE INDEX IF NOT EXISTS idx_erp_quotations_parent_id ON public.erp_quotations(parent_id);

-- Update status check if needed (current: 'draft', 'sent', 'approved', 'rejected', 'expired')
-- No change needed to status list for now, but we'll use 'approved' as the lock trigger.
