-- Fix infinite recursion in profiles table RLS policies
-- The issue was that policies were checking profiles table from within profiles table policies

-- First, drop all existing policies on profiles table
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Simple non-recursive policies for profiles table
-- Users can read their own profile
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own profile (though this might not be needed)
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (auth.uid() = user_id);

-- For admin access to all profiles, create a simple admin policy
-- Assuming admin user has a specific user_id or email pattern
-- You may need to adjust this based on how you identify admins
CREATE POLICY "profiles_admin_access" ON profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email LIKE '%admin%'
  )
);

-- Alternative: If you have an admin flag in a separate table or metadata
-- CREATE POLICY "profiles_admin_access" ON profiles
-- FOR ALL USING (
--   auth.uid() IN (
--     SELECT user_id FROM admin_users  -- assuming you have such a table
--   )
-- );

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;