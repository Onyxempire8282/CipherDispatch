-- First, get Arianna's user_id
-- Then update unassigned claims to assign to Arianna and archive them

-- Step 1: Find Arianna's user_id
SELECT user_id, full_name, role 
FROM profiles 
WHERE full_name ILIKE '%arianna%';

-- Step 2: Count unassigned claims to verify
SELECT COUNT(*) as unassigned_count
FROM claims
WHERE assigned_to IS NULL
AND archived_at IS NULL;

-- Step 3: Update unassigned claims (replace USER_ID_HERE with Arianna's actual user_id)
-- UPDATE claims
-- SET 
--   assigned_to = 'USER_ID_HERE',
--   archived_at = NOW()
-- WHERE assigned_to IS NULL
-- AND archived_at IS NULL;
