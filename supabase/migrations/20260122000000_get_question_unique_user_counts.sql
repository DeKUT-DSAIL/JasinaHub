-- Create a function to get unique user counts per question that bypasses RLS
-- This is a SECURITY DEFINER function, meaning it runs with the privileges of the creator (usually the postgres role)
-- but is only accessible via this specific function.

CREATE OR REPLACE FUNCTION public.get_question_unique_user_counts()
RETURNS TABLE(question_id uuid, unique_user_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vr.question_id,
    COUNT(DISTINCT vr.user_id)::bigint AS unique_user_count
  FROM public.voice_responses vr
  GROUP BY vr.question_id;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_question_unique_user_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_question_unique_user_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_question_unique_user_counts() TO anon;

COMMENT ON FUNCTION public.get_question_unique_user_counts() IS 'Returns unique user counts per question, bypassing RLS for safe aggregation.';
