-- Create function to get unique user counts per question
CREATE OR REPLACE FUNCTION public.get_question_unique_user_counts()
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