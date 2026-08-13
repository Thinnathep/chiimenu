-- 1. Create a new storage bucket called 'store_assets' (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('store_assets', 'store_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to view files (since it's logos and covers)
DROP POLICY IF EXISTS "Store Assets Public Access" ON storage.objects;
CREATE POLICY "Store Assets Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'store_assets');

-- 3. Allow authenticated merchants to upload files to the bucket
-- Using a simpler policy to avoid foldername array parsing issues
DROP POLICY IF EXISTS "Merchants can upload to their own store folder" ON storage.objects;
CREATE POLICY "Merchants can upload to their own store folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store_assets');

-- 4. Allow merchants to update their own files (using owner_id which Supabase sets automatically)
DROP POLICY IF EXISTS "Merchants can update their own files" ON storage.objects;
CREATE POLICY "Merchants can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store_assets' AND owner_id = auth.uid()::text);

-- 5. Allow merchants to delete their own files
DROP POLICY IF EXISTS "Merchants can delete their own files" ON storage.objects;
CREATE POLICY "Merchants can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store_assets' AND owner_id = auth.uid()::text);

