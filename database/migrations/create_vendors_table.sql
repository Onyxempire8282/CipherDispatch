-- Create vendors table for managing payout vendors
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#9CA3AF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage vendors"
  ON vendors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Appraisers can only read vendors (for dropdown menus)
CREATE POLICY "Appraisers can view vendors"
  ON vendors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'appraiser'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);

-- Insert default vendors (migrated from firmColors.ts)
INSERT INTO vendors (name, color) VALUES
  ('Sedgwick', '#9CA3AF'),
  ('ACD', '#F59E0B'),
  ('ClaimSolution', '#8B5CF6'),
  ('CCS', '#EF4444'),
  ('Doan', '#10B981'),
  ('Legacy', '#3B82F6'),
  ('AMA', '#FACC15'),
  ('IANET', '#92400E'),
  ('ATeam', '#06B6D4'),
  ('HEA', '#6366F1'),
  ('Frontline', '#1F2937')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE vendors IS 'Stores vendor/firm information for insurance claims';
COMMENT ON COLUMN vendors.name IS 'Unique vendor name';
COMMENT ON COLUMN vendors.color IS 'Hex color code for vendor UI representation';
