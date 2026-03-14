-- Add all missing columns to profiles table
-- These are referenced by the invite-contractor edge function and contractor edit form
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS pay_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS rating NUMERIC,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS coverage_states TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coverage_cities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS onboard_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dispatch_enabled BOOLEAN DEFAULT true;
