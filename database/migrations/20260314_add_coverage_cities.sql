-- Add coverage columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coverage_states TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coverage_cities TEXT[] DEFAULT '{}';
