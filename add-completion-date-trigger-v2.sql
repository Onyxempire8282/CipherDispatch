-- Create trigger to set completion_date as DATE ONLY (no time component)
-- This prevents timezone shift issues

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_completion_date_on_complete ON claims;
DROP TRIGGER IF EXISTS set_completion_date_on_insert ON claims;
DROP FUNCTION IF EXISTS set_completion_date_on_complete();

-- Create the trigger function
CREATE OR REPLACE FUNCTION set_completion_date_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to COMPLETED and completion_date is not set
  IF NEW.status = 'COMPLETED' AND NEW.completion_date IS NULL THEN
    -- Set completion_date to CURRENT_DATE (date only, no time)
    -- This ensures consistent timezone handling
    NEW.completion_date = CURRENT_DATE::timestamp;

    -- Also set completed_month if not already set
    IF NEW.completed_month IS NULL THEN
      NEW.completed_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    END IF;
  END IF;

  -- If status is being changed FROM COMPLETED to something else, clear completion_date
  IF OLD.status IS NOT NULL AND OLD.status = 'COMPLETED' AND NEW.status != 'COMPLETED' THEN
    NEW.completion_date = NULL;
    NEW.completed_month = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the UPDATE trigger
CREATE TRIGGER set_completion_date_on_complete
  BEFORE UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION set_completion_date_on_complete();

-- Create the INSERT trigger
CREATE TRIGGER set_completion_date_on_insert
  BEFORE INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION set_completion_date_on_complete();

-- Test the trigger
SELECT
  'Trigger created successfully' as status,
  'completion_date will auto-populate as DATE ONLY (midnight) when status=COMPLETED' as message;

-- Show example of what dates will look like
SELECT
  CURRENT_DATE as date_only,
  CURRENT_DATE::timestamp as as_timestamp,
  TO_CHAR(CURRENT_DATE::timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted;
