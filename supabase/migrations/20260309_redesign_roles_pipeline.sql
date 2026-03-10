-- CIPHER DISPATCH -- Comprehensive Redesign Migration
-- Phase 1: Role expansion + Pipeline stage + Fee columns

-- 1. Expand role constraint on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'dispatch', 'writer', 'appraiser'));

-- 2. Add pipeline_stage to claims
ALTER TABLE claims ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'received';

ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_pipeline_stage_check;

ALTER TABLE claims ADD CONSTRAINT claims_pipeline_stage_check
  CHECK (pipeline_stage IN (
    'received', 'assigned', 'scheduled', 'in_field',
    'photos_complete', 'estimate_writing', 'estimate_complete',
    'supplement_open', 'supplement_complete', 'closed', 'archived'
  ));

-- 3. Add completed_at timestamp
ALTER TABLE claims ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 4. Add claim_type for fee logic
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_type TEXT DEFAULT 'auto';

ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_claim_type_check;

ALTER TABLE claims ADD CONSTRAINT claims_claim_type_check
  CHECK (claim_type IN ('auto', 'heavy_duty', 'photos_scope'));

-- 5. Add mileage_add and photographer_payout
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mileage_add NUMERIC(10,2) DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS photographer_payout NUMERIC(10,2) DEFAULT 0;

-- 6. Add fee columns to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fee_auto NUMERIC(10,2);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fee_heavy_duty NUMERIC(10,2);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fee_photos_scope NUMERIC(10,2);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_insurance_company TEXT;

-- 7. Backfill pipeline_stage from existing status
UPDATE claims SET pipeline_stage = CASE
  WHEN archived_at IS NOT NULL THEN 'archived'
  WHEN status = 'COMPLETED' THEN 'closed'
  WHEN status = 'CANCELED' THEN 'closed'
  WHEN status = 'IN_PROGRESS' AND appointment_start IS NOT NULL THEN 'scheduled'
  WHEN status = 'IN_PROGRESS' AND assigned_to IS NOT NULL THEN 'assigned'
  WHEN status = 'IN_PROGRESS' THEN 'received'
  WHEN status = 'UNASSIGNED' THEN 'received'
  ELSE 'received'
END
WHERE pipeline_stage IS NULL OR pipeline_stage = 'received';

-- 8. Backfill completed_at from existing data
UPDATE claims SET completed_at = updated_at
WHERE status = 'COMPLETED' AND completed_at IS NULL;
