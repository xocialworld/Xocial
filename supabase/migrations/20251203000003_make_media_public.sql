-- Make media bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'media';

-- Ensure RLS policies for storage allow public access to media
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' );

-- Allow authenticated uploads
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'media' );

-- Allow owners to update/delete
CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text );

CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text );
