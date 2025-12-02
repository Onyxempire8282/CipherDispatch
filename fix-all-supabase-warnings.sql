-- ========================================
-- COMPREHENSIVE FIX FOR ALL SUPABASE WARNINGS
-- Run this entire file in Supabase SQL Editor
-- ========================================

-- ========================================
-- PART 1: FIX NOTIFICATIONS RLS POLICIES
-- Optimize auth.uid() calls for better performance
-- ========================================

-- Drop existing notification policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;

-- Create optimized notification policies
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Allow insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- ========================================
-- PART 2: CONSOLIDATE CLAIMS POLICIES
-- Combine duplicate policies into single efficient policies
-- ========================================

-- Drop old claims policies
DROP POLICY IF EXISTS "claims admin all" ON claims;
DROP POLICY IF EXISTS "claims appraiser read" ON claims;
DROP POLICY IF EXISTS "claims appraiser update assigned" ON claims;

-- Create consolidated claims policies
CREATE POLICY "claims_select_policy" ON claims
FOR SELECT
TO authenticated
USING (
  -- Admin can see all
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'))
  OR
  -- Appraiser can see assigned claims
  (assigned_to = (select auth.uid()))
);

CREATE POLICY "claims_insert_policy" ON claims
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only admins can insert
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin')
);

CREATE POLICY "claims_update_policy" ON claims
FOR UPDATE
TO authenticated
USING (
  -- Admin can update all
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'))
  OR
  -- Appraiser can update assigned claims
  (assigned_to = (select auth.uid()))
);

CREATE POLICY "claims_delete_policy" ON claims
FOR DELETE
TO authenticated
USING (
  -- Only admins can delete
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin')
);

-- ========================================
-- PART 3: CONSOLIDATE CLAIM_PHOTOS POLICIES
-- Combine duplicate policies into single efficient policies
-- ========================================

-- Drop old claim_photos policies
DROP POLICY IF EXISTS "photos admin all" ON claim_photos;
DROP POLICY IF EXISTS "photos appraiser assigned" ON claim_photos;

-- Create consolidated claim_photos policies
CREATE POLICY "claim_photos_select_policy" ON claim_photos
FOR SELECT
TO authenticated
USING (
  -- Admin can see all
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'))
  OR
  -- Appraiser can see photos for assigned claims
  (EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = claim_photos.claim_id 
    AND claims.assigned_to = (select auth.uid())
  ))
);

CREATE POLICY "claim_photos_insert_policy" ON claim_photos
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin can insert all
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'))
  OR
  -- Appraiser can insert photos for assigned claims
  (EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = claim_photos.claim_id 
    AND claims.assigned_to = (select auth.uid())
  ))
);

CREATE POLICY "claim_photos_update_policy" ON claim_photos
FOR UPDATE
TO authenticated
USING (
  -- Admin can update all
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'))
  OR
  -- Appraiser can update photos for assigned claims
  (EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = claim_photos.claim_id 
    AND claims.assigned_to = (select auth.uid())
  ))
);

CREATE POLICY "claim_photos_delete_policy" ON claim_photos
FOR DELETE
TO authenticated
USING (
  -- Admin can delete all
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin'))
  OR
  -- Appraiser can delete photos for assigned claims
  (EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = claim_photos.claim_id 
    AND claims.assigned_to = (select auth.uid())
  ))
);

-- ========================================
-- PART 4: CONSOLIDATE PROFILES POLICIES
-- Combine duplicate policies into single efficient policies
-- ========================================

-- Drop old profiles policies
DROP POLICY IF EXISTS "profiles admin read" ON profiles;
DROP POLICY IF EXISTS "profiles self read" ON profiles;
DROP POLICY IF EXISTS "profiles admin write" ON profiles;
DROP POLICY IF EXISTS "profiles self write" ON profiles;

-- Create consolidated profiles policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
TO authenticated
USING (
  -- Admin can see all
  (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (select auth.uid()) AND p.role = 'admin'))
  OR
  -- User can see their own profile
  (user_id = (select auth.uid()))
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only admins can insert (create new users)
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin')
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
TO authenticated
USING (
  -- Admin can update all
  (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (select auth.uid()) AND p.role = 'admin'))
  OR
  -- User can update their own profile
  (user_id = (select auth.uid()))
);

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE
TO authenticated
USING (
  -- Only admins can delete
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (select auth.uid()) AND p.role = 'admin')
);

-- ========================================
-- PART 5: REMOVE DUPLICATE INDEX
-- Drop the duplicate status index
-- ========================================

DROP INDEX IF EXISTS claims_status_idx;
-- Keep idx_claims_status (it's the same)

-- ========================================
-- VERIFICATION QUERIES (Optional - Run These After)
-- ========================================

-- Verify policies are in place
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Verify indexes
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'claims';

-- Test notification query performance
-- EXPLAIN ANALYZE SELECT * FROM notifications WHERE user_id = auth.uid() LIMIT 10;
