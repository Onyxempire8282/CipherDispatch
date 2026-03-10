-- Migration: Add vendor contact fields for Vendor Profile page
-- Date: 2026-03-10

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_phone TEXT;
