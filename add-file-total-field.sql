-- Add file_total field to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS file_total DECIMAL(10, 2);
