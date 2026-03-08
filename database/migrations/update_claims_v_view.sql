-- ═══════════════════════════════════════════════════════════════
-- Update claims_v view to include all required columns
-- Fixes: missing columns error when updating claims
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.claims_v AS
SELECT
  id,
  claim_number,
  customer_name,
  customer_phone,
  email,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vin,
  date_of_loss,
  insurance_company,
  address_line1,
  address_line2,
  city,
  state,
  zip,
  notes,
  assigned_to,
  appointment_start,
  appointment_end,
  firm,
  firm_name,
  pay_amount,
  file_total,
  status,
  lat,
  lng,
  created_at,
  updated_at,
  archived_at,
  completion_date,
  completed_month,
  expected_payout_date,
  payout_status,
  actual_payout_date
FROM public.claims;

-- Grant permissions (match existing table permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_v TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_v TO service_role;
