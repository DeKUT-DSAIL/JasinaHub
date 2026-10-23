-- ==============================================================================
-- Category Access Requests
-- Allows users to request recording/transcription access for specific categories.
-- Admins can then grant or revoke access per user per category.
-- ==============================================================================

-- Table: category_access_requests
-- Tracks each user's request to contribute to a specific category.
CREATE TABLE IF NOT EXISTS public.category_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  -- 'pending' | 'approved' | 'rejected'
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  -- optional admin note
  admin_note TEXT,
  UNIQUE (user_id, category_id)
);

-- Index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_cat_access_requests_status
  ON public.category_access_requests(status);

CREATE INDEX IF NOT EXISTS idx_cat_access_requests_user_id
  ON public.category_access_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_cat_access_requests_category_id
  ON public.category_access_requests(category_id);

-- ------------------------------------------------------------------------------
-- RLS Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.category_access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own category access requests"
  ON public.category_access_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can create own category access requests"
  ON public.category_access_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all category access requests"
  ON public.category_access_requests
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update (approve/reject) requests
CREATE POLICY "Admins can update category access requests"
  ON public.category_access_requests
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete requests
CREATE POLICY "Admins can delete category access requests"
  ON public.category_access_requests
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
