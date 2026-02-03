-- ═══════════════════════════════════════════════════════════════
-- Update claims_v view to include archived_at column
-- Fixes: "column claims_v.archived_at does not exist" error
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
  archived_at
FROM public.claims;

-- Grant permissions (match existing table permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_v TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_v TO service_role;
