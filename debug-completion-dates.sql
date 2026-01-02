-- Debug script to check completion_date format and values
-- Run this in Supabase SQL Editor to see what's stored

SELECT
  claim_number,
  firm_name,
  status,
  completion_date,
  -- Show the raw value type
  pg_typeof(completion_date) as date_type,
  -- Extract components
  EXTRACT(YEAR FROM completion_date) as year,
  EXTRACT(MONTH FROM completion_date) as month,
  EXTRACT(DAY FROM completion_date) as day,
  EXTRACT(HOUR FROM completion_date) as hour,
  -- Format in different ways
  TO_CHAR(completion_date, 'YYYY-MM-DD HH24:MI:SS') as formatted_with_time,
  TO_CHAR(completion_date, 'YYYY-MM-DD') as formatted_date_only,
  completion_date::text as as_text
FROM claims
WHERE status = 'COMPLETED'
  AND completion_date IS NOT NULL
ORDER BY completion_date DESC
LIMIT 10;

-- Count by month to see distribution
SELECT
  EXTRACT(YEAR FROM completion_date) as year,
  EXTRACT(MONTH FROM completion_date) as month,
  COUNT(*) as count
FROM claims
WHERE status = 'COMPLETED'
  AND completion_date IS NOT NULL
GROUP BY EXTRACT(YEAR FROM completion_date), EXTRACT(MONTH FROM completion_date)
ORDER BY year DESC, month DESC;
