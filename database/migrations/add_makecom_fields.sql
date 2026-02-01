-- ═══════════════════════════════════════════════════════════════
-- Make.com Integration Schema Additions
-- Adds/renames columns for automated claim creation via Make.com
-- ═══════════════════════════════════════════════════════════════

-- 1. Rename firm_name to firm (canonical field name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'firm_name'
  ) THEN
    ALTER TABLE claims RENAME COLUMN firm_name TO firm;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'firm'
  ) THEN
    ALTER TABLE claims ADD COLUMN firm TEXT;
  END IF;
END $$;

-- 2. Rename postal_code to zip (match Make.com field name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE claims RENAME COLUMN postal_code TO zip;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'zip'
  ) THEN
    ALTER TABLE claims ADD COLUMN zip TEXT;
  END IF;
END $$;

-- 3. Rename phone to customer_phone (match Make.com field name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'phone'
  ) THEN
    ALTER TABLE claims RENAME COLUMN phone TO customer_phone;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE claims ADD COLUMN customer_phone TEXT;
  END IF;
END $$;

-- 4. Add file_number column (vendor's internal reference)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS file_number TEXT;

-- 5. Add location_name column (name at inspection location)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_name TEXT;

-- 6. Add location_phone column (phone at inspection location)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_phone TEXT;

-- 7. Add claim_status column for API workflow tracking
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'created';

-- 8. Drop old unique constraint on claim_number alone (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claims_claim_number_key'
    AND conrelid = 'claims'::regclass
  ) THEN
    ALTER TABLE claims DROP CONSTRAINT claims_claim_number_key;
  END IF;
END $$;

-- 9. Drop old unique index on firm_name if exists
DROP INDEX IF EXISTS idx_claims_firm_claim_unique;

-- 10. Create composite unique index on (firm, claim_number)
--     This is the idempotency key for Make.com integration
--     COALESCE handles any legacy claims with null firm
CREATE UNIQUE INDEX idx_claims_firm_claim_unique
  ON claims (COALESCE(firm, ''), claim_number);

-- 11. Performance indexes
CREATE INDEX IF NOT EXISTS idx_claims_file_number
  ON claims (file_number)
  WHERE file_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claims_claim_status
  ON claims (claim_status)
  WHERE archived_at IS NULL;

-- Column documentation
COMMENT ON COLUMN claims.firm IS 'Vendor/firm name (part of unique key with claim_number)';
COMMENT ON COLUMN claims.claim_number IS 'Claim identifier (part of unique key with firm)';
COMMENT ON COLUMN claims.zip IS 'ZIP/postal code';
COMMENT ON COLUMN claims.customer_phone IS 'Customer phone number';
COMMENT ON COLUMN claims.file_number IS 'Vendor file reference number';
COMMENT ON COLUMN claims.location_name IS 'Name at inspection location';
COMMENT ON COLUMN claims.location_phone IS 'Phone at inspection location';
COMMENT ON COLUMN claims.claim_status IS 'API workflow status: created, processing, error';
