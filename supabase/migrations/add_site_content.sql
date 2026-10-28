-- ============================================================
-- Migration: add_site_content
-- Purpose:   Store editable site content (consent form,
--            privacy policy) in the database so admins can
--            update copy without a code deploy.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_content (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT        NOT NULL UNIQUE,
  title        TEXT        NOT NULL DEFAULT '',
  content_md   TEXT        NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can read
DROP POLICY IF EXISTS "site_content_read" ON public.site_content;
CREATE POLICY "site_content_read" ON public.site_content
  FOR SELECT
  USING (true);

-- Only admins can insert / update / delete
DROP POLICY IF EXISTS "site_content_admin_write" ON public.site_content;
CREATE POLICY "site_content_admin_write" ON public.site_content
  FOR ALL
  TO authenticated
  USING     (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed the two canonical content keys with empty defaults.
-- ON CONFLICT DO NOTHING means re-running this migration is safe.
INSERT INTO public.site_content (key, title, content_md) VALUES
  ('consent_form',   'Data Collection Consent Form', ''),
  ('privacy_policy', 'Privacy Policy',               '')
ON CONFLICT (key) DO NOTHING;

