-- Fix completion dates for claims marked as COMPLETED but missing completion_date
-- Strategy: Use appointment_end if available, otherwise appointment_start, otherwise created_at

-- Option 1: Update using appointment_end (most accurate)
UPDATE claims
SET completion_date = appointment_end
WHERE status = 'COMPLETED'
  AND completion_date IS NULL
  AND appointment_end IS NOT NULL;

-- Option 2: For remaining claims, use appointment_start
UPDATE claims
SET completion_date = appointment_start
WHERE status = 'COMPLETED'
  AND completion_date IS NULL
  AND appointment_start IS NOT NULL;

-- Option 3: For remaining claims, use created_at as fallback
UPDATE claims
SET completion_date = created_at
WHERE status = 'COMPLETED'
  AND completion_date IS NULL
  AND created_at IS NOT NULL;

-- Option 4: Last resort - use current timestamp (only if nothing else available)
UPDATE claims
SET completion_date = CURRENT_TIMESTAMP
WHERE status = 'COMPLETED'
  AND completion_date IS NULL;

-- Verify the results
SELECT
  status,
  COUNT(*) as total_claims,
  COUNT(completion_date) as claims_with_completion_date,
  COUNT(*) - COUNT(completion_date) as claims_missing_date
FROM claims
WHERE status = 'COMPLETED'
GROUP BY status;

-- Show a sample of the updated claims
SELECT
  id,
  claim_number,
  customer_name,
  firm_name,
  status,
  completion_date,
  appointment_start,
  appointment_end,
  created_at
FROM claims
WHERE status = 'COMPLETED'
ORDER BY completion_date DESC
LIMIT 10;
