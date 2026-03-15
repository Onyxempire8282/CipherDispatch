-- Migration: Create create_claim RPC function
-- Date: 2026-03-14
-- Fixes: Missing RPC function after migrating from HQ to CD
-- Note: p_owner_id accepted but not inserted (no owner_id column in CD)
-- Note: p_inspection_address maps to address_line1 in CD claims table

CREATE OR REPLACE FUNCTION public.create_claim(
  p_owner_id uuid DEFAULT NULL,
  p_firm text DEFAULT NULL,
  p_claim_number text DEFAULT NULL,
  p_file_number text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_vehicle_make text DEFAULT NULL,
  p_vehicle_model text DEFAULT NULL,
  p_vehicle_year integer DEFAULT NULL,
  p_vin text DEFAULT NULL,
  p_inspection_address text DEFAULT NULL,
  p_zip text DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.claims (
    firm,
    claim_number,
    file_number,
    customer_name,
    customer_phone,
    vehicle_make,
    vehicle_model,
    vehicle_year,
    vin,
    address_line1,
    zip,
    scheduled_at,
    notes,
    firm_id,
    status,
    created_at
  ) VALUES (
    p_firm,
    p_claim_number,
    p_file_number,
    p_customer_name,
    p_customer_phone,
    p_vehicle_make,
    p_vehicle_model,
    p_vehicle_year,
    p_vin,
    p_inspection_address,
    p_zip,
    p_scheduled_at,
    p_notes,
    p_firm_id,
    'IN_PROGRESS',
    now()
  );
END;
$$;
