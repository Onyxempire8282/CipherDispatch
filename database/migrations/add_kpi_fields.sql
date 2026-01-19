-- ═══════════════════════════════════════════════════════════════
-- KPI Module Schema Additions (V1)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add scheduled_at column (when scheduling action occurred)
--    This separates "when was this scheduled" from "when is the appointment"
ALTER TABLE claims ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- 2. Add supplement tracking fields
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_supplement BOOLEAN DEFAULT false;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS original_claim_id UUID REFERENCES claims(id);

-- 3. Backfill scheduled_at from appointment_start for existing claims
--    (Only for claims that have an appointment but no scheduled_at)
UPDATE claims
SET scheduled_at = appointment_start
WHERE scheduled_at IS NULL
  AND appointment_start IS NOT NULL;

-- 4. Index for KPI queries (completion_date range queries)
CREATE INDEX IF NOT EXISTS idx_claims_completion_date
  ON claims (completion_date)
  WHERE archived_at IS NULL;

-- 5. Index for pipeline status queries
CREATE INDEX IF NOT EXISTS idx_claims_status_active
  ON claims (status)
  WHERE archived_at IS NULL;

-- 6. Index for scheduled_at queries
CREATE INDEX IF NOT EXISTS idx_claims_scheduled_at
  ON claims (scheduled_at)
  WHERE archived_at IS NULL;

-- 7. Composite index for KPI date range queries
CREATE INDEX IF NOT EXISTS idx_claims_kpi_dates
  ON claims (completion_date, appointment_start, scheduled_at)
  WHERE archived_at IS NULL;
