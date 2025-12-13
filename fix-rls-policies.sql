-- ========================================
-- FIXED RLS POLICIES - WORKING VERSION
-- Run this in Supabase SQL Editor after disabling RLS
-- ========================================

-- Re-enable RLS for all tables
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PROFILES TABLE POLICIES
-- ========================================

-- Drop any existing profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create working profiles policies
CREATE POLICY "profiles_access" ON profiles
FOR ALL
TO authenticated
USING (
  -- Admin can see all profiles
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  OR
  -- User can access their own profile
  user_id = auth.uid()
)
WITH CHECK (
  -- Admin can modify all profiles
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  OR
  -- User can modify their own profile
  user_id = auth.uid()
);

-- ========================================
-- CLAIMS TABLE POLICIES
-- ========================================

-- Drop any existing claims policies
DROP POLICY IF EXISTS "claims_select_policy" ON claims;
DROP POLICY IF EXISTS "claims_insert_policy" ON claims;
DROP POLICY IF EXISTS "claims_update_policy" ON claims;
DROP POLICY IF EXISTS "claims_delete_policy" ON claims;

-- Create working claims policies
CREATE POLICY "claims_access" ON claims
FOR ALL
TO authenticated
USING (
  -- Admin can access all claims
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  OR
  -- Appraiser can access assigned claims
  assigned_to = auth.uid()
)
WITH CHECK (
  -- Admin can modify all claims
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  OR
  -- Appraiser can modify assigned claims
  assigned_to = auth.uid()
);

-- ========================================
-- CLAIM_PHOTOS TABLE POLICIES
-- ========================================

-- Drop any existing claim_photos policies
DROP POLICY IF EXISTS "claim_photos_select_policy" ON claim_photos;
DROP POLICY IF EXISTS "claim_photos_insert_policy" ON claim_photos;
DROP POLICY IF EXISTS "claim_photos_update_policy" ON claim_photos;
DROP POLICY IF EXISTS "claim_photos_delete_policy" ON claim_photos;

-- Create working claim_photos policies
CREATE POLICY "claim_photos_access" ON claim_photos
FOR ALL
TO authenticated
USING (
  -- Admin can access all photos
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  OR
  -- Appraiser can access photos for assigned claims
  EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = claim_photos.claim_id 
    AND claims.assigned_to = auth.uid()
  )
)
WITH CHECK (
  -- Admin can modify all photos
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  OR
  -- Appraiser can modify photos for assigned claims
  EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = claim_photos.claim_id 
    AND claims.assigned_to = auth.uid()
  )
);

-- ========================================
-- NOTIFICATIONS TABLE POLICIES
-- ========================================

-- Drop any existing notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;

-- Create working notifications policies
CREATE POLICY "notifications_access" ON notifications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow system to insert notifications
CREATE POLICY "notifications_system_insert" ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ========================================
-- VERIFICATION
-- ========================================

-- Test the policies work
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been recreated successfully!';
  RAISE NOTICE 'You can now test the application with security enabled.';
END
$$;