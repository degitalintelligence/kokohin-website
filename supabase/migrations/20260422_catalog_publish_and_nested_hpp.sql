DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalogs'
      AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.catalogs
      ADD COLUMN is_published boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_hpp_components'
      AND column_name = 'source_catalog_id'
  ) THEN
    ALTER TABLE public.catalog_hpp_components
      ADD COLUMN source_catalog_id uuid NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_hpp_components'
      AND column_name = 'material_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.catalog_hpp_components
      ALTER COLUMN material_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_hpp_components_source_catalog_id_fkey'
      AND conrelid = 'public.catalog_hpp_components'::regclass
  ) THEN
    ALTER TABLE public.catalog_hpp_components
      ADD CONSTRAINT catalog_hpp_components_source_catalog_id_fkey
      FOREIGN KEY (source_catalog_id)
      REFERENCES public.catalogs(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_hpp_components_material_or_catalog_check'
      AND conrelid = 'public.catalog_hpp_components'::regclass
  ) THEN
    ALTER TABLE public.catalog_hpp_components
      DROP CONSTRAINT catalog_hpp_components_material_or_catalog_check;
  END IF;

  ALTER TABLE public.catalog_hpp_components
    ADD CONSTRAINT catalog_hpp_components_material_or_catalog_check
    CHECK (
      (material_id IS NOT NULL AND source_catalog_id IS NULL)
      OR
      (material_id IS NULL AND source_catalog_id IS NOT NULL)
    );
END $$;

CREATE OR REPLACE FUNCTION public.calculate_catalog_hpp(target_catalog_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS numeric AS $$
DECLARE
  v_total_material_cost numeric := 0;
  v_total_nested_catalog_cost numeric := 0;
  v_std_calc numeric := 1.00;
  v_use_std boolean := false;
  v_final_hpp numeric := 0;
  v_total_base_cost numeric := 0;
BEGIN
  SELECT
    COALESCE(std_calculation, 1.00),
    COALESCE(use_std_calculation, false)
  INTO v_std_calc, v_use_std
  FROM public.catalogs
  WHERE id = target_catalog_id;

  SELECT COALESCE(SUM(c.quantity * COALESCE(m.base_price_per_unit, 0)), 0)
  INTO v_total_material_cost
  FROM public.catalog_hpp_components c
  LEFT JOIN public.materials m ON c.material_id = m.id
  WHERE c.catalog_id = target_catalog_id
    AND c.material_id IS NOT NULL;

  SELECT COALESCE(SUM(c.quantity * COALESCE(src.hpp_per_unit, 0)), 0)
  INTO v_total_nested_catalog_cost
  FROM public.catalog_hpp_components c
  LEFT JOIN public.catalogs src ON c.source_catalog_id = src.id
  WHERE c.catalog_id = target_catalog_id
    AND c.source_catalog_id IS NOT NULL;

  v_total_base_cost := v_total_material_cost + v_total_nested_catalog_cost;

  IF v_use_std AND v_std_calc > 0 THEN
    v_final_hpp := v_total_base_cost / v_std_calc;
  ELSE
    v_final_hpp := v_total_base_cost;
  END IF;

  UPDATE public.catalogs
  SET hpp_per_unit = v_final_hpp
  WHERE id = target_catalog_id;

  INSERT INTO public.catalog_hpp_log (catalog_id, hpp_per_m2, total_cost, calc_by)
  VALUES (target_catalog_id, v_final_hpp, v_total_base_cost, user_id);

  RETURN v_final_hpp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trigger_catalog_settings_change_hpp()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.std_calculation IS DISTINCT FROM OLD.std_calculation
    OR NEW.use_std_calculation IS DISTINCT FROM OLD.use_std_calculation
  ) THEN
    PERFORM public.calculate_catalog_hpp(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
