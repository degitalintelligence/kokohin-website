CREATE OR REPLACE FUNCTION public.validate_catalog_finishing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate on INSERT, or when category/finishing fields are changed.
  IF TG_OP = 'UPDATE'
     AND NEW.category IS NOT DISTINCT FROM OLD.category
     AND NEW.finishing_id IS NOT DISTINCT FROM OLD.finishing_id THEN
    RETURN NEW;
  END IF;

  IF NEW.category NOT IN ('aksesoris', 'lainnya') AND NEW.finishing_id IS NULL THEN
    RAISE EXCEPTION 'Produk kategori % wajib memiliki nilai Finishing yang valid.', NEW.category;
  END IF;

  IF NEW.category = 'lainnya' AND NEW.finishing_id IS NULL THEN
    RAISE EXCEPTION 'Item kategori "Lainnya" wajib memiliki nilai Finishing untuk mencegah miss-spect.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
