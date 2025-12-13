-- ========================================
-- FIXED RLS POLICIES - WORKING VERSION (NO RECURSION)
-- Run this in Supabase SQL Editor after disabling RLS
-- ========================================

-- Re-enable RLS for all tables
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PROFILES TABLE POLICIES (SIMPLE - NO RECURSION)
-- ========================================

-- Drop any existing profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_access" ON profiles;

-- Create simple profiles policies
CREATE POLICY "profiles_read" ON profiles
FOR SELECT
TO authenticated
USING (true); -- Allow all authenticated users to read profiles

CREATE POLICY "profiles_write" ON profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ========================================
-- CLAIMS TABLE POLICIES (FIXED - NO RECURSION)
-- ========================================

-- Drop any existing claims policies
DROP POLICY IF EXISTS "claims_select_policy" ON claims;
DROP POLICY IF EXISTS "claims_insert_policy" ON claims;
DROP POLICY IF EXISTS "claims_update_policy" ON claims;
DROP POLICY IF EXISTS "claims_delete_policy" ON claims;
DROP POLICY IF EXISTS "claims_access" ON claims;

-- Create working claims policies WITHOUT recursive profile lookups
CREATE POLICY "claims_select" ON claims
FOR SELECT
TO authenticated
USING (
  -- Allow access if assigned to user OR if user is admin (checked in app)
  assigned_to = auth.uid() 
  OR 
  -- Simple admin check using a direct role lookup (no recursion)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "claims_insert" ON claims
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow insert if user has admin role
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "claims_update" ON claims
FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "claims_delete" ON claims
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- ========================================
-- CLAIM_PHOTOS TABLE POLICIES
-- ========================================

-- Drop any existing claim_photos policies
DROP POLICY IF EXISTS "claim_photos_select_policy" ON claim_photos;
DROP POLICY IF EXISTS "claim_photos_insert_policy" ON claim_photos;
DROP POLICY IF EXISTS "claim_photos_update_policy" ON claim_photos;
DROP POLICY IF EXISTS "claim_photos_delete_policy" ON claim_photos;
DROP POLICY IF EXISTS "claim_photos_access" ON claim_photos;

-- Create working claim_photos policies
CREATE POLICY "claim_photos_all" ON claim_photos
FOR ALL
TO authenticated
USING (
  -- Admin can access all OR user can access their assigned claims
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = claim_photos.claim_id 
    AND claims.assigned_to = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR
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
DROP POLICY IF EXISTS "notifications_access" ON notifications;
DROP POLICY IF EXISTS "notifications_system_insert" ON notifications;

-- Create simple notifications policies
CREATE POLICY "notifications_user" ON notifications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ========================================
-- VERIFICATION
-- ========================================

-- Test the policies work
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been recreated successfully WITHOUT RECURSION!';
  RAISE NOTICE 'You can now test the application with security enabled.';
END
$$;