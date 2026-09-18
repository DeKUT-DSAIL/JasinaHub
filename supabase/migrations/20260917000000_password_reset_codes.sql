-- Migration to create password_reset_codes table for 6-digit short code verification
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_lookup 
  ON public.password_reset_codes (email, code, used);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires 
  ON public.password_reset_codes (expires_at);

-- Enable Row Level Security
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Deny public/anon access. Access is restricted to service_role (used by Edge Functions).
CREATE POLICY "Service role full access to password_reset_codes"
  ON public.password_reset_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

