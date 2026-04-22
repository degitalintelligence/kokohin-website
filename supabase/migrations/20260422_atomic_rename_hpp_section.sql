CREATE OR REPLACE FUNCTION public.rename_catalog_hpp_section(
  old_code text,
  new_code text,
  new_name text,
  new_sort_order integer,
  new_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old text := lower(trim(coalesce(old_code, '')));
  v_new text := lower(trim(coalesce(new_code, '')));
BEGIN
  IF v_old = '' OR v_new = '' THEN
    RAISE EXCEPTION 'Kode segmen tidak valid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.catalog_hpp_sections s
    WHERE s.code = v_old
  ) THEN
    RAISE EXCEPTION 'Segmen sumber tidak ditemukan';
  END IF;

  IF v_old = v_new THEN
    UPDATE public.catalog_hpp_sections
    SET
      name = coalesce(new_name, name),
      sort_order = coalesce(new_sort_order, sort_order),
      is_active = coalesce(new_is_active, is_active),
      updated_at = now()
    WHERE code = v_old;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.catalog_hpp_sections s
    WHERE s.code = v_new
  ) THEN
    RAISE EXCEPTION 'Kode segmen % sudah digunakan', v_new;
  END IF;

  INSERT INTO public.catalog_hpp_sections (code, name, sort_order, is_active)
  SELECT
    v_new,
    coalesce(new_name, s.name),
    coalesce(new_sort_order, s.sort_order),
    coalesce(new_is_active, s.is_active)
  FROM public.catalog_hpp_sections s
  WHERE s.code = v_old;

  DELETE FROM public.catalog_category_hpp_sections m
  WHERE m.section_code = v_old
    AND EXISTS (
      SELECT 1
      FROM public.catalog_category_hpp_sections x
      WHERE x.category_code = m.category_code
        AND x.section_code = v_new
    );

  UPDATE public.catalog_hpp_components
  SET section = v_new
  WHERE section = v_old;

  UPDATE public.catalog_category_hpp_sections
  SET section_code = v_new
  WHERE section_code = v_old;

  DELETE FROM public.catalog_hpp_sections
  WHERE code = v_old;
END;
$$;
