-- Migration: Add payout tracking fields to claims table
-- This enables firm reliability metrics and payment tracking

-- Add expected_payout_date column (when we expect to receive payment based on firm's pay schedule)
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS expected_payout_date DATE;

-- Add actual_payout_date column (when payment was actually received)
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS actual_payout_date DATE;

-- Add payout_status column (tracks payment lifecycle)
DO $$ BEGIN
  CREATE TYPE payout_status_enum AS ENUM ('unpaid', 'paid', 'overdue', 'not_applicable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE claims
ADD COLUMN IF NOT EXISTS payout_status payout_status_enum DEFAULT 'not_applicable';

-- Add completion_date if it doesn't exist (from existing codebase references)
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_expected_payout_date ON claims(expected_payout_date);
CREATE INDEX IF NOT EXISTS idx_claims_actual_payout_date ON claims(actual_payout_date);
CREATE INDEX IF NOT EXISTS idx_claims_payout_status ON claims(payout_status);
CREATE INDEX IF NOT EXISTS idx_claims_completion_date ON claims(completion_date);
CREATE INDEX IF NOT EXISTS idx_claims_firm_payout_status ON claims(firm_name, payout_status);

-- Add comments for documentation
COMMENT ON COLUMN claims.expected_payout_date IS 'Expected payment date based on firm pay schedule (calculated from completion_date and firm pay cycles)';
COMMENT ON COLUMN claims.actual_payout_date IS 'Actual date when payment was received from the firm';
COMMENT ON COLUMN claims.payout_status IS 'Payment status: unpaid (awaiting payment), paid (received), overdue (past expected date), not_applicable (not yet completed)';
COMMENT ON COLUMN claims.completion_date IS 'Date when the claim was marked as completed';

-- Default payout_status logic:
-- For completed claims without a status set, default to 'unpaid'
UPDATE claims
SET payout_status = 'unpaid'
WHERE status = 'COMPLETED'
  AND payout_status = 'not_applicable'
  AND completion_date IS NOT NULL;
