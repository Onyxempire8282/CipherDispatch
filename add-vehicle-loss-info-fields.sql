-- Add date_of_loss and insurance_company fields to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS date_of_loss DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS insurance_company TEXT;
