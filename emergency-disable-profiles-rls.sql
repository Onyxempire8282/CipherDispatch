-- Emergency fix: Temporarily disable RLS on profiles table to resolve infinite recursion
-- This will allow the application to function while we design proper non-recursive policies

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean slate
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_access" ON profiles;

-- Note: With RLS disabled, all authenticated users can read all profiles
-- This is temporary to get the system working
-- You should implement proper non-recursive policies later

-- Verify current state
SELECT schemaname, tablename, rowsecurity, hasrowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';