-- Add pay_amount field to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS pay_amount DECIMAL(10, 2);
CREATE INDEX IF NOT EXISTS idx_claims_pay_amount ON claims(pay_amount);
