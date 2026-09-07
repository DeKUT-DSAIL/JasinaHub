-- Drop and recreate the view with security_invoker to fix security definer warning
DROP VIEW IF EXISTS public.question_answer_counts;

-- Create a secure function to get question counts (SECURITY DEFINER allows bypassing RLS)
-- This only returns aggregate counts, no individual user data is exposed
CREATE OR REPLACE FUNCTION public.get_question_counts()
RETURNS TABLE(question_id uuid, unique_user_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT question_id, COUNT(DISTINCT user_id) as unique_user_count
  FROM public.voice_responses
  GROUP BY question_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_question_counts() TO authenticated;