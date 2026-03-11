-- Migration: Add missing columns to claims table
-- Date: 2026-03-10
-- Fixes: BLOCKING-03 (silent data loss on create)
--
-- These columns are collected in the NewClaim form but were not persisted
-- because the create_claim RPC doesn't accept them and no follow-up UPDATE
-- was performed. The follow-up UPDATE is now in the app code, but these
-- columns must exist in the DB.

-- Add columns only if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'claim_type') THEN
    ALTER TABLE public.claims ADD COLUMN claim_type text DEFAULT 'auto';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'mileage_add') THEN
    ALTER TABLE public.claims ADD COLUMN mileage_add numeric DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'photographer_payout') THEN
    ALTER TABLE public.claims ADD COLUMN photographer_payout numeric DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'email') THEN
    ALTER TABLE public.claims ADD COLUMN email text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'date_of_loss') THEN
    ALTER TABLE public.claims ADD COLUMN date_of_loss date DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'file_total') THEN
    ALTER TABLE public.claims ADD COLUMN file_total numeric DEFAULT NULL;
  END IF;
END $$;
