-- Migration: 20260226_atomic_contract_creation.sql
-- Provides an RPC for atomic contract and item creation

CREATE OR REPLACE FUNCTION public.create_contract_with_items(
    p_quotation_id uuid,
    p_contract_number text,
    p_total_value numeric,
    p_signatory_id uuid,
    p_scope_snapshot text,
    p_attachments jsonb,
    p_payment_terms_json jsonb,
    p_items jsonb -- Array of {name, unit, quantity, unit_price, subtotal, type}
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract_id uuid;
    v_item jsonb;
BEGIN
    -- 1. Insert Contract
    INSERT INTO public.erp_contracts (
        quotation_id,
        contract_number,
        total_value,
        status,
        start_date,
        signatory_id,
        scope_snapshot,
        attachments,
        payment_terms_json
    ) VALUES (
        p_quotation_id,
        p_contract_number,
        p_total_value,
        'draft',
        CURRENT_DATE,
        p_signatory_id,
        p_scope_snapshot,
        p_attachments,
        p_payment_terms_json
    ) RETURNING id INTO v_contract_id;

    -- 2. Insert Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.erp_contract_items (
            contract_id,
            name,
            unit,
            quantity,
            unit_price,
            subtotal,
            type
        ) VALUES (
            v_contract_id,
            v_item->>'name',
            v_item->>'unit',
            (v_item->>'quantity')::numeric,
            (v_item->>'unit_price')::numeric,
            (v_item->>'subtotal')::numeric,
            v_item->>'type'
        );
    END LOOP;

    RETURN v_contract_id;
END;
$$ LANGUAGE plpgsql;
