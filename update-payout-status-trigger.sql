-- Trigger to auto-update payout_status based on actual_payout_date
-- When actual_payout_date is set, mark as 'paid'
-- This provides a database-level guarantee of status consistency

CREATE OR REPLACE FUNCTION update_payout_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If actual_payout_date is being set (not null)
  IF NEW.actual_payout_date IS NOT NULL AND OLD.actual_payout_date IS NULL THEN
    NEW.payout_status = 'paid';
  END IF;

  -- If actual_payout_date is being cleared
  IF NEW.actual_payout_date IS NULL AND OLD.actual_payout_date IS NOT NULL THEN
    -- Revert to unpaid if expected date exists, otherwise not_applicable
    IF NEW.expected_payout_date IS NOT NULL THEN
      NEW.payout_status = 'unpaid';
    ELSE
      NEW.payout_status = 'not_applicable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_update_payout_status ON claims;

-- Create trigger on claims table
CREATE TRIGGER trigger_update_payout_status
  BEFORE UPDATE ON claims
  FOR EACH ROW
  WHEN (
    OLD.actual_payout_date IS DISTINCT FROM NEW.actual_payout_date
  )
  EXECUTE FUNCTION update_payout_status();

-- Note: This trigger ensures payout_status is automatically updated when actual_payout_date changes
-- It does NOT automatically mark claims as 'overdue' - that would require a scheduled job
-- to periodically check for unpaid claims past their expected_payout_date
