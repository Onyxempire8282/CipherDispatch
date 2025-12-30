-- Migration: Add pay_amount and active columns to vendors table
-- This allows storing firm-specific pay amounts and enabling/disabling vendors

-- Add pay_amount column to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS pay_amount DECIMAL(10, 2);

-- Add active column to vendors table (default to true)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Create index on active column for faster queries
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(active);

-- Update all firms with their pay amounts
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'ACD';
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'HEA';
UPDATE vendors SET pay_amount = 67.00 WHERE name = 'CCS';
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'ClaimSolution';
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'IANET';
UPDATE vendors SET pay_amount = 70.00 WHERE name = 'Legacy';
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'AMA';
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'ATeam';
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'Frontline';
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'Sedgwick';
UPDATE vendors SET pay_amount = 65.00 WHERE name = 'Doan';

-- Deactivate SCA (no longer taking them as a client)
UPDATE vendors SET active = false WHERE name = 'SCA';

-- Comment for future reference
COMMENT ON COLUMN vendors.pay_amount IS 'Default pay amount for this vendor in USD';
COMMENT ON COLUMN vendors.active IS 'Whether this vendor is currently active and should appear in dropdowns';
