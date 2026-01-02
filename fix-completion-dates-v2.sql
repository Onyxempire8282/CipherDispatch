-- Fix completion dates - VERSION 2
-- Extract DATE ONLY (no time component) to avoid timezone shift issues

-- First, let's see what we're working with
SELECT
  claim_number,
  status,
  completion_date,
  DATE(appointment_end) as appt_end_date,
  DATE(appointment_start) as appt_start_date,
  DATE(created_at) as created_date
FROM claims
WHERE status = 'COMPLETED'
LIMIT 5;

-- Clear all completion_date values for COMPLETED claims to start fresh
UPDATE claims
SET completion_date = NULL
WHERE status = 'COMPLETED';

-- Option 1: Use DATE from appointment_end (converts to date-only, no time)
UPDATE claims
SET completion_date = DATE(appointment_end)::timestamp
WHERE status = 'COMPLETED'
  AND completion_date IS NULL
  AND appointment_end IS NOT NULL;

-- Option 2: Use DATE from appointment_start
UPDATE claims
SET completion_date = DATE(appointment_start)::timestamp
WHERE status = 'COMPLETED'
  AND completion_date IS NULL
  AND appointment_start IS NOT NULL;

-- Option 3: Use DATE from created_at
UPDATE claims
SET completion_date = DATE(created_at)::timestamp
WHERE status = 'COMPLETED'
  AND completion_date IS NULL
  AND created_at IS NOT NULL;

-- Option 4: Last resort - use CURRENT_DATE (date only, no time)
UPDATE claims
SET completion_date = CURRENT_DATE::timestamp
WHERE status = 'COMPLETED'
  AND completion_date IS NULL;

-- Verify all completion_date values are midnight (00:00:00)
SELECT
  claim_number,
  firm_name,
  status,
  completion_date,
  EXTRACT(HOUR FROM completion_date) as hour,
  EXTRACT(MINUTE FROM completion_date) as minute,
  TO_CHAR(completion_date, 'YYYY-MM-DD HH24:MI:SS') as formatted_date
FROM claims
WHERE status = 'COMPLETED'
ORDER BY completion_date DESC
LIMIT 10;

-- Count by month to verify
SELECT
  TO_CHAR(completion_date, 'YYYY-MM') as month,
  COUNT(*) as completed_claims
FROM claims
WHERE status = 'COMPLETED'
  AND completion_date IS NOT NULL
GROUP BY TO_CHAR(completion_date, 'YYYY-MM')
ORDER BY month DESC;
