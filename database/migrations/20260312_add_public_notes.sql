-- Migration: Add public_notes column for client-visible notes
-- Date: 2026-03-12
-- Purpose: Separate client-facing notes from internal notes
--
-- Run this in Supabase SQL Editor BEFORE deploying the frontend.
-- The claims_v view uses SELECT * so it picks up new columns automatically.

ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS public_notes TEXT;

COMMENT ON COLUMN public.claims.public_notes IS
  'Client-visible notes shown to carriers and TPAs. Separate from internal notes.';
