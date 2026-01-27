-- ═══════════════════════════════════════════════════════════════
-- Mileage Logs Table (IRS-Defensible Mileage Tracking)
-- ═══════════════════════════════════════════════════════════════
--
-- PURPOSE:
-- Captures frozen mileage data when routes are closed.
-- One row per route/workday. Data is immutable after creation.
--
-- DESIGN:
-- - Mileage derived from Google Maps Directions API at close time
-- - No manual entry, no GPS tracking
-- - Addresses and miles frozen at route close
-- - RLS immutability policies applied in separate migration
--
-- ═══════════════════════════════════════════════════════════════

-- 1. Create mileage_logs table
CREATE TABLE mileage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  log_date DATE NOT NULL,
  start_address TEXT NOT NULL,
  end_address TEXT NOT NULL,
  total_miles NUMERIC(7,1) NOT NULL,
  business_purpose TEXT NOT NULL DEFAULT 'Auto damage inspections',
  claim_count INTEGER NOT NULL DEFAULT 0,
  claim_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Index for user export queries (filter by user + date range)
CREATE INDEX idx_mileage_logs_user_date ON mileage_logs(user_id, log_date);

-- 3. Index for date range queries (admin reports)
CREATE INDEX idx_mileage_logs_date ON mileage_logs(log_date);

-- ═══════════════════════════════════════════════════════════════
-- NOTE: RLS policies for immutability will be applied separately
-- after this migration succeeds. See: add_mileage_logs_rls.sql
-- ═══════════════════════════════════════════════════════════════
