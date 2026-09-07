-- Create a view to expose question response counts (without user details)
-- This view only shows aggregate counts, not individual user data
CREATE OR REPLACE VIEW public.question_answer_counts AS
SELECT 
  question_id,
  COUNT(DISTINCT user_id) as unique_user_count
FROM public.voice_responses
GROUP BY question_id;

-- Grant access to authenticated users to read this view
GRANT SELECT ON public.question_answer_counts TO authenticated;

-- Enable RLS on the underlying table doesn't affect this view since it's SECURITY DEFINER by default
-- But we need to create a policy to allow reading this aggregated data
-- Views with aggregation don't expose individual row data, just counts