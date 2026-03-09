-- Storage policies for claim-photos bucket
-- Run in Supabase SQL Editor

-- Allow authenticated users to upload photos
INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
SELECT 'Allow authenticated uploads', 'claim-photos', 'INSERT',
       '(auth.role() = ''authenticated'')',
       '(auth.role() = ''authenticated'')'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'claim-photos' AND operation = 'INSERT'
);

-- Allow authenticated users to read photos
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'Allow authenticated reads', 'claim-photos', 'SELECT',
       '(auth.role() = ''authenticated'')'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'claim-photos' AND operation = 'SELECT'
);

-- Allow authenticated users to delete photos
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'Allow authenticated deletes', 'claim-photos', 'DELETE',
       '(auth.role() = ''authenticated'')'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'claim-photos' AND operation = 'DELETE'
);
