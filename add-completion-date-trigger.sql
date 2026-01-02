-- Create a trigger to automatically set completion_date when status changes to COMPLETED
-- This ensures completion_date is always set, even if updated directly in database

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_completion_date_on_complete ON claims;
DROP FUNCTION IF EXISTS set_completion_date_on_complete();

-- Create the trigger function
CREATE OR REPLACE FUNCTION set_completion_date_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to COMPLETED and completion_date is not set
  IF NEW.status = 'COMPLETED' AND NEW.completion_date IS NULL THEN
    -- Set completion_date to current timestamp
    NEW.completion_date = CURRENT_TIMESTAMP;

    -- Also set completed_month if not already set
    IF NEW.completed_month IS NULL THEN
      NEW.completed_month = TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM');
    END IF;
  END IF;

  -- If status is being changed FROM COMPLETED to something else, clear completion_date
  IF OLD.status = 'COMPLETED' AND NEW.status != 'COMPLETED' THEN
    NEW.completion_date = NULL;
    NEW.completed_month = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER set_completion_date_on_complete
  BEFORE UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION set_completion_date_on_complete();

-- Also create an INSERT trigger in case claims are inserted as COMPLETED
CREATE TRIGGER set_completion_date_on_insert
  BEFORE INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION set_completion_date_on_complete();

-- Test the trigger by showing info
SELECT
  'Trigger created successfully' as status,
  'completion_date will now auto-populate when status=COMPLETED' as message;
