-- Ensure new columns for services CMS and create storage bucket

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='is_active'
  ) THEN
    ALTER TABLE services ADD COLUMN is_active boolean DEFAULT true;
    UPDATE services SET is_active = true WHERE is_active IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='meta_title'
  ) THEN
    ALTER TABLE services ADD COLUMN meta_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='meta_description'
  ) THEN
    ALTER TABLE services ADD COLUMN meta_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='meta_keywords'
  ) THEN
    ALTER TABLE services ADD COLUMN meta_keywords text;
  END IF;
END $$;

-- Create public storage bucket for services thumbnails if missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('services', 'services', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for services bucket
CREATE POLICY IF NOT EXISTS "public_read_services_bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'services');

CREATE POLICY IF NOT EXISTS "admins_manage_services_bucket" ON storage.objects
  FOR ALL USING (get_user_role() in ('super_admin','admin_sales','admin_proyek'))
  WITH CHECK (get_user_role() in ('super_admin','admin_sales','admin_proyek'));

