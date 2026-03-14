-- Add coverage_cities column to profiles table
-- Stores an array of city names the contractor covers
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coverage_cities TEXT[] DEFAULT '{}';
