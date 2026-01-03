-- Delete Historical Import Claims from Active Claims Table
-- These claims were imported for analytics but shouldn't appear in All Claims dashboard
-- Historical data remains in monthly_performance_log and monthly_firm_activity tables

-- IMPORTANT: Review before running!
-- This will permanently delete claims imported via import-est-history-as-claims.js

-- Preview what will be deleted (run this first)
SELECT
  id,
  claim_number,
  customer_name,
  firm_name,
  status,
  completion_date,
  notes
FROM claims
WHERE
  notes LIKE '%Imported from EST archive%'
  OR customer_name LIKE 'Historical Import%'
ORDER BY completion_date DESC;

-- Get count of historical claims
SELECT
  COUNT(*) as total_historical_claims,
  MIN(completion_date) as earliest_date,
  MAX(completion_date) as latest_date
FROM claims
WHERE
  notes LIKE '%Imported from EST archive%'
  OR customer_name LIKE 'Historical Import%';

-- UNCOMMENT BELOW TO DELETE (after reviewing above)
/*
DELETE FROM claims
WHERE
  notes LIKE '%Imported from EST archive%'
  OR customer_name LIKE 'Historical Import%';
*/

-- After deletion, verify analytics tables still have data:
/*
SELECT month, completed_claims, firms_active
FROM monthly_performance_log
ORDER BY month DESC
LIMIT 10;

SELECT month, firm_name, claims_completed
FROM monthly_firm_activity
ORDER BY month DESC, firm_name
LIMIT 20;
*/
