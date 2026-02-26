-- Migration: 20260226_add_builder_metadata_to_erp.sql
-- Adds metadata columns to erp_quotations to support independent "Quote Builder" logic

ALTER TABLE public.erp_quotations 
ADD COLUMN IF NOT EXISTS panjang decimal(15,2),
ADD COLUMN IF NOT EXISTS lebar decimal(15,2),
ADD COLUMN IF NOT EXISTS unit_qty decimal(15,2),
ADD COLUMN IF NOT EXISTS margin_percentage decimal(15,2),
ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.catalogs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_hpp decimal(15,2);

-- Also add to erp_contracts for completeness if we ever want to re-build from contract
ALTER TABLE public.erp_contracts
ADD COLUMN IF NOT EXISTS panjang decimal(15,2),
ADD COLUMN IF NOT EXISTS lebar decimal(15,2),
ADD COLUMN IF NOT EXISTS unit_qty decimal(15,2),
ADD COLUMN IF NOT EXISTS margin_percentage decimal(15,2),
ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.catalogs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_hpp decimal(15,2);
