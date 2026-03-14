-- Migration: Create claim_messages table for messaging threads
-- Date: 2026-03-14

CREATE TABLE IF NOT EXISTS public.claim_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text NOT NULL,
  body text NOT NULL,
  message_type text NOT NULL DEFAULT 'firm',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add message_type column if table already exists but column is missing
ALTER TABLE public.claim_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'firm';

-- Index for fast lookups by claim
CREATE INDEX IF NOT EXISTS idx_claim_messages_claim_id
  ON public.claim_messages(claim_id);

CREATE INDEX IF NOT EXISTS idx_claim_messages_type
  ON public.claim_messages(claim_id, message_type);

-- Enable RLS
ALTER TABLE public.claim_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY claim_messages_admin_all ON public.claim_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Appraisers can read messages on claims assigned to them
CREATE POLICY claim_messages_appraiser_select ON public.claim_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.id = claim_messages.claim_id
        AND (claims.assigned_to = auth.uid() OR claims.writer_id = auth.uid())
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_messages TO service_role;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.claim_messages;
