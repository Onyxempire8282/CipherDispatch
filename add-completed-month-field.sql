-- Add completed_month field to track which month a claim was completed
-- Format: YYYY-MM (e.g., "2025-01", "2025-02")
-- This allows monthly throughput tracking without deleting historical data

-- Add the column
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS completed_month TEXT;

-- Backfill existing completed claims with their completion month
UPDATE claims
SET completed_month = TO_CHAR(completion_date::DATE, 'YYYY-MM')
WHERE status = 'COMPLETED'
  AND completion_date IS NOT NULL
  AND completed_month IS NULL;

-- Create index for faster monthly queries
CREATE INDEX IF NOT EXISTS idx_claims_completed_month ON claims(completed_month);

-- Create index for current month queries
CREATE INDEX IF NOT EXISTS idx_claims_status_completed_month ON claims(status, completed_month);

-- Comments for documentation
COMMENT ON COLUMN claims.completed_month IS 'Month when claim was completed (YYYY-MM format). Used for monthly throughput tracking.';
