-- ═══════════════════════════════════════════════════════════════
-- Update claims_v view to include ALL columns the app queries
-- Run this in Supabase SQL Editor to fix 400 errors
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
  actual_payout_date,
  owner_id,
  inspection_address,
  location_name,
  location_phone,
  location_type,
  confirm_token,
  appt_confirmed,
  is_supplement,
  original_claim_id,
  supplement_number,
  supplement_reason,
  supp_location_changed,
  supp_address_line1,
  supp_city,
  supp_state,
  supp_zip,
  writer_id,
  writing_started_at,
  writing_completed_at,
  photos_completed,
  scheduled_at
FROM public.claims;

-- Grant permissions (match existing table permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_v TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_v TO service_role;
GRANT SELECT ON public.claims_v TO anon;
