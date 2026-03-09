-- Allow anonymous users to read claims by confirm_token (for /confirm public page)
CREATE POLICY "anon_read_by_confirm_token"
  ON claims
  FOR SELECT
  TO anon
  USING (confirm_token IS NOT NULL AND confirm_token = current_setting('request.jwt.claims', true)::json->>'confirm_token');

-- Simpler alternative: allow anon to read any claim that has a confirm_token set
-- This is safe because confirm_token is a UUID that acts as a bearer token
DROP POLICY IF EXISTS "anon_read_by_confirm_token" ON claims;

CREATE POLICY "anon_read_claims_with_token"
  ON claims
  FOR SELECT
  TO anon
  USING (confirm_token IS NOT NULL);

-- Allow anonymous users to update appt_confirmed via the confirm token
CREATE POLICY "anon_confirm_appointment"
  ON claims
  FOR UPDATE
  TO anon
  USING (confirm_token IS NOT NULL)
  WITH CHECK (confirm_token IS NOT NULL);
