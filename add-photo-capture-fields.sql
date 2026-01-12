-- Add fields to claim_photos table for guided photo capture flow

-- Add photo_type field (type of photo: vin_windshield, engine_bay, etc.)
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS photo_type TEXT;

-- Add order_index field (order in the capture sequence)
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Add required field (whether this photo slot is required)
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT false;

-- Add conditional_group field (for conditional sections like structural, airbags, tow_bill)
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS conditional_group TEXT;

-- Add inspection_type field (regular or heavy_duty)
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS inspection_type TEXT;

-- Add optional photos_completed field to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS photos_completed BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_claim_photos_claim_id_order ON claim_photos(claim_id, order_index);
CREATE INDEX IF NOT EXISTS idx_claim_photos_photo_type ON claim_photos(photo_type);
