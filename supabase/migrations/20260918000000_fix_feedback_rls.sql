-- Fix feedback RLS policies so all authenticated users can read active questions
-- and submit their own feedback (already permitted, but ensuring clarity).

-- Drop the overly-restrictive questions SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view active questions" ON public.feedback_questions;

-- Replace it with a clean policy: any authenticated user can view active questions
CREATE POLICY "Authenticated users can view active questions"
  ON public.feedback_questions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins still see all questions (active or not) through the admin panel
CREATE POLICY "Admins can view all questions"
  ON public.feedback_questions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

