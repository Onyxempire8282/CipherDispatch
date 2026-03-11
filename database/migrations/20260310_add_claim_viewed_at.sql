-- Migration: Add viewed_by_appraiser_at column to claims
-- Date: 2026-03-10
-- Purpose: Track when an appraiser first views an assigned claim
-- Used by: Unviewed claim badge on appraiser nav

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims'
    AND column_name = 'viewed_by_appraiser_at'
  ) THEN
    ALTER TABLE public.claims
    ADD COLUMN viewed_by_appraiser_at
    TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;
