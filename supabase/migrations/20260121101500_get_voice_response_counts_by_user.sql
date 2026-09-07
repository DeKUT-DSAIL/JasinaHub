-- Accurate per-user response counts for admin UI (avoids Supabase 1000-row limit)
CREATE OR REPLACE FUNCTION public.get_voice_response_counts_by_user()
RETURNS TABLE(user_id uuid, response_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vr.user_id,
    COUNT(*)::bigint AS response_count
  FROM public.voice_responses vr
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  GROUP BY vr.user_id;
$$;


