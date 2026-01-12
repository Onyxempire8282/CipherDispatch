-- Optional: Create audit table for tracking photo deletions
-- This is useful for compliance and debugging

CREATE TABLE IF NOT EXISTS photo_deletion_audit (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL,
  claim_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_created_at TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NOW(),
  deleted_by TEXT DEFAULT 'cleanup-cron',
  deletion_reason TEXT DEFAULT 'retention_policy'
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_photo_deletion_audit_deleted_at
ON photo_deletion_audit(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_photo_deletion_audit_claim_id
ON photo_deletion_audit(claim_id);

-- Add RLS policies (if needed)
ALTER TABLE photo_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view audit records
CREATE POLICY "Authenticated users can view deletion audit"
ON photo_deletion_audit FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert audit records
-- (This happens automatically via the Edge Function using service role key)

-- Optional: Create a view for easy reporting
CREATE OR REPLACE VIEW photo_deletion_summary AS
SELECT
  DATE(deleted_at) as deletion_date,
  COUNT(*) as photos_deleted,
  COUNT(DISTINCT claim_id) as claims_affected,
  deleted_by
FROM photo_deletion_audit
GROUP BY DATE(deleted_at), deleted_by
ORDER BY deletion_date DESC;

-- Grant access to the view
GRANT SELECT ON photo_deletion_summary TO authenticated;

COMMENT ON TABLE photo_deletion_audit IS 'Audit trail for automated photo deletions from cleanup-old-photos Edge Function';
COMMENT ON VIEW photo_deletion_summary IS 'Daily summary of photo deletions for monitoring and reporting';
