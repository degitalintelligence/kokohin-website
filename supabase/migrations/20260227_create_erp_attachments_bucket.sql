
-- 1. Create erp-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('erp-attachments', 'erp-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Delete" ON storage.objects;

-- Create policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'erp-attachments' );

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'erp-attachments' );

CREATE POLICY "Authenticated Update Delete"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'erp-attachments' )
WITH CHECK ( bucket_id = 'erp-attachments' );
