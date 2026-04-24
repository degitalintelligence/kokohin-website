CREATE TABLE IF NOT EXISTS public.erp_quotation_item_baseline_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.erp_quotations(id) ON DELETE CASCADE,
  quotation_item_id uuid NOT NULL REFERENCES public.erp_quotation_items(id) ON DELETE CASCADE,
  component_key text NOT NULL,
  component_name text NOT NULL,
  segment text NOT NULL DEFAULT 'lainnya',
  source_type text NOT NULL DEFAULT 'catalog',
  material_name_snapshot text,
  unit_snapshot text,
  qty_snapshot numeric NOT NULL DEFAULT 0,
  hpp_snapshot numeric NOT NULL DEFAULT 0,
  subtotal_snapshot numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_item_id, component_key)
);

CREATE TABLE IF NOT EXISTS public.erp_quotation_item_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.erp_quotations(id) ON DELETE CASCADE,
  quotation_item_id uuid NOT NULL REFERENCES public.erp_quotation_items(id) ON DELETE CASCADE,
  line_no integer NOT NULL DEFAULT 1,
  component_key text NOT NULL,
  component_name text NOT NULL,
  segment text NOT NULL DEFAULT 'lainnya',
  source_type text NOT NULL DEFAULT 'catalog',
  mode text,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  material_name_snapshot text,
  unit_snapshot text,
  qty_base numeric NOT NULL DEFAULT 0,
  qty_final numeric NOT NULL DEFAULT 0,
  hpp_snapshot numeric NOT NULL DEFAULT 0,
  subtotal_final numeric NOT NULL DEFAULT 0,
  is_excluded boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_item_id, line_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'erp_quotation_item_baseline_costs_source_type_check'
  ) THEN
    ALTER TABLE public.erp_quotation_item_baseline_costs
      ADD CONSTRAINT erp_quotation_item_baseline_costs_source_type_check
      CHECK (source_type IN ('catalog', 'addon', 'override', 'manual'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'erp_quotation_item_costs_source_type_check'
  ) THEN
    ALTER TABLE public.erp_quotation_item_costs
      ADD CONSTRAINT erp_quotation_item_costs_source_type_check
      CHECK (source_type IN ('catalog', 'addon', 'override', 'manual'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'erp_quotation_item_costs_mode_check'
  ) THEN
    ALTER TABLE public.erp_quotation_item_costs
      ADD CONSTRAINT erp_quotation_item_costs_mode_check
      CHECK (mode IS NULL OR mode IN ('fixed', 'variable'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotation_item_baseline_costs_quotation_id
  ON public.erp_quotation_item_baseline_costs(quotation_id);

CREATE INDEX IF NOT EXISTS idx_quotation_item_baseline_costs_item_id
  ON public.erp_quotation_item_baseline_costs(quotation_item_id);

CREATE INDEX IF NOT EXISTS idx_quotation_item_costs_quotation_id
  ON public.erp_quotation_item_costs(quotation_id);

CREATE INDEX IF NOT EXISTS idx_quotation_item_costs_item_id
  ON public.erp_quotation_item_costs(quotation_item_id);

