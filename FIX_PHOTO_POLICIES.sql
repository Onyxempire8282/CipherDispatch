-- Fix Supabase Storage Policies for Photos
-- Run this in Supabase SQL Editor to enable public photo viewing

-- First, let's see existing policies (for reference)
-- Go to: Storage > claim-photos > Policies tab to view current policies

-- Drop existing SELECT policies if they're too restrictive
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;

-- Create a policy that allows ANYONE to view (SELECT) photos
CREATE POLICY "Public read access for claim photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'claim-photos');

-- Keep INSERT restricted to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload claim photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'claim-photos');

-- Keep UPDATE restricted to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
CREATE POLICY "Authenticated users can update claim photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'claim-photos');

-- Keep DELETE restricted to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete claim photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'claim-photos');

-- Verify the policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;
