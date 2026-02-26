-- Migration: 20260224_add_std_calculation_to_catalogs.sql
-- Adds std_calculation and audit log for HPP per m2

DO $$
BEGIN
    -- 1. Add columns to catalogs table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'catalogs' AND column_name = 'std_calculation'
    ) THEN
        ALTER TABLE public.catalogs 
        ADD COLUMN std_calculation numeric DEFAULT 1.00 CHECK (std_calculation > 0),
        ADD COLUMN use_std_calculation boolean DEFAULT false;

        COMMENT ON COLUMN public.catalogs.std_calculation IS 'Standard quantity (e.g., m2) used as divisor for HPP calculation';
        COMMENT ON COLUMN public.catalogs.use_std_calculation IS 'Flag to enable new HPP per m2 calculation logic';
    END IF;

    -- 2. Create catalog_hpp_log table for audit trail
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'catalog_hpp_log'
    ) THEN
        CREATE TABLE public.catalog_hpp_log (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            catalog_id uuid REFERENCES public.catalogs(id) ON DELETE CASCADE,
            hpp_per_m2 numeric NOT NULL,
            total_cost numeric NOT NULL,
            calc_date timestamp with time zone DEFAULT now(),
            calc_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
        );

        -- RLS for audit log (admin only)
        ALTER TABLE public.catalog_hpp_log ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Admins can read hpp logs" ON public.catalog_hpp_log
            FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin_sales', 'admin_proyek'));
    END IF;
END $$;

-- 3. Create or replace function to calculate HPP
CREATE OR REPLACE FUNCTION public.calculate_catalog_hpp(target_catalog_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS numeric AS $$
DECLARE
    v_total_material_cost numeric := 0;
    v_labor_cost numeric := 0;
    v_transport_cost numeric := 0;
    v_std_calc numeric := 1.00;
    v_use_std boolean := false;
    v_final_hpp numeric := 0;
    v_total_base_cost numeric := 0;
BEGIN
    -- Get catalog settings
    SELECT 
        COALESCE(labor_cost, 0), 
        COALESCE(transport_cost, 0),
        COALESCE(std_calculation, 1.00),
        COALESCE(use_std_calculation, false)
    INTO v_labor_cost, v_transport_cost, v_std_calc, v_use_std
    FROM public.catalogs
    WHERE id = target_catalog_id;

    -- Calculate total material cost from catalog_hpp_components
    SELECT SUM(c.quantity * m.base_price_per_unit)
    INTO v_total_material_cost
    FROM public.catalog_hpp_components c
    JOIN public.materials m ON c.material_id = m.id
    WHERE c.catalog_id = target_catalog_id;

    v_total_base_cost := COALESCE(v_total_material_cost, 0) + v_labor_cost + v_transport_cost;

    -- Apply std_calculation if enabled
    IF v_use_std AND v_std_calc > 0 THEN
        v_final_hpp := v_total_base_cost / v_std_calc;
    ELSE
        v_final_hpp := v_total_base_cost;
    END IF;

    -- Update catalog
    UPDATE public.catalogs 
    SET hpp_per_unit = v_final_hpp 
    WHERE id = target_catalog_id;

    -- Log calculation
    INSERT INTO public.catalog_hpp_log (catalog_id, hpp_per_m2, total_cost, calc_by)
    VALUES (target_catalog_id, v_final_hpp, v_total_base_cost, user_id);

    RETURN v_final_hpp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to auto-update HPP on component changes
CREATE OR REPLACE FUNCTION public.trigger_calculate_catalog_hpp()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.calculate_catalog_hpp(OLD.catalog_id);
        RETURN OLD;
    ELSE
        PERFORM public.calculate_catalog_hpp(NEW.catalog_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_catalog_hpp ON public.catalog_hpp_components;
CREATE TRIGGER trg_update_catalog_hpp
AFTER INSERT OR UPDATE OR DELETE ON public.catalog_hpp_components
FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_catalog_hpp();

-- 5. Create trigger for catalog changes (std_calculation or labor/transport)
CREATE OR REPLACE FUNCTION public.trigger_catalog_settings_change_hpp()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.std_calculation IS DISTINCT FROM OLD.std_calculation OR 
        NEW.use_std_calculation IS DISTINCT FROM OLD.use_std_calculation OR
        NEW.labor_cost IS DISTINCT FROM OLD.labor_cost OR
        NEW.transport_cost IS DISTINCT FROM OLD.transport_cost) THEN
        PERFORM public.calculate_catalog_hpp(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_catalog_settings_hpp ON public.catalogs;
CREATE TRIGGER trg_catalog_settings_hpp
AFTER UPDATE ON public.catalogs
FOR EACH ROW EXECUTE FUNCTION public.trigger_catalog_settings_change_hpp();
