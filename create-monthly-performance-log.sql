-- Create monthly_performance_log table for historical tracking
-- This table stores end-of-month snapshots for trend analysis

CREATE TABLE IF NOT EXISTS monthly_performance_log (
  month TEXT PRIMARY KEY,  -- YYYY-MM format
  completed_claims INTEGER NOT NULL DEFAULT 0,
  backlog INTEGER NOT NULL DEFAULT 0,
  avg_velocity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  burnout_ratio NUMERIC(10, 3) NOT NULL DEFAULT 0,
  firms_active INTEGER NOT NULL DEFAULT 0,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for sorting by month
CREATE INDEX IF NOT EXISTS idx_monthly_performance_log_month ON monthly_performance_log(month DESC);

-- Create table to track firm activity per month
CREATE TABLE IF NOT EXISTS monthly_firm_activity (
  month TEXT NOT NULL,  -- YYYY-MM format
  firm_name TEXT NOT NULL,
  claims_completed INTEGER NOT NULL DEFAULT 0,
  revenue_generated NUMERIC(10, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (month, firm_name)
);

-- Create index for firm activity lookups
CREATE INDEX IF NOT EXISTS idx_monthly_firm_activity_month ON monthly_firm_activity(month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_firm_activity_firm ON monthly_firm_activity(firm_name);

COMMENT ON TABLE monthly_performance_log IS 'Stores end-of-month performance snapshots for historical trend analysis';
COMMENT ON TABLE monthly_firm_activity IS 'Tracks claims and revenue per firm per month for heatmap visualization';
