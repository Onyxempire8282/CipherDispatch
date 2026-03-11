-- Migration: Update claims_v view to expose new columns
-- Date: 2026-03-10
-- Depends on: 20260310_add_missing_claim_columns.sql
--
-- Uses SELECT * to automatically pick up all current and future columns.
-- This keeps the view auto-updatable (no JOINs).

CREATE OR REPLACE VIEW public.claims_v AS
SELECT * FROM public.claims;

-- Grant permissions (match existing table permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_v TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_v TO service_role;
GRANT SELECT ON public.claims_v TO anon;
