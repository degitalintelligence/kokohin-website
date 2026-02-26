-- Migration: 20260226_add_attachments_to_invoices.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_invoices' AND column_name = 'attachments') THEN
        ALTER TABLE public.erp_invoices
        ADD COLUMN attachments jsonb DEFAULT '[]';
    END IF;
END $$;
