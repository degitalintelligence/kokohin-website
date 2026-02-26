-- Migration: 20260226_make_estimation_id_nullable.sql
-- Relax constraint to allow quotations from leads without a calculator estimation

ALTER TABLE public.erp_quotations 
ALTER COLUMN estimation_id DROP NOT NULL;
