-- RLS policies for orders storage bucket
-- Allow authenticated users (admins) to upload/read QR images

INSERT INTO storage.buckets (id, name, public) 
VALUES ('orders', 'orders', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload to orders bucket
CREATE POLICY "Admins can upload order QR images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'orders');

-- Allow authenticated users to read from orders bucket
CREATE POLICY "Admins can read order QR images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'orders');

-- Allow public read access (bucket is public)
CREATE POLICY "Public can read order QR images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'orders');
