
CREATE OR REPLACE FUNCTION public.claim_random_transcription(_user_id uuid)
RETURNS TABLE(
  id uuid,
  audio_file_url text,
  question_id uuid,
  duration_seconds integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vr.id, vr.audio_file_url, vr.question_id, vr.duration_seconds
  FROM public.voice_responses vr
  WHERE vr.status = 'accepted'
    AND vr.user_id != _user_id
    AND vr.audio_file_url IS NOT NULL
    AND vr.audio_file_url LIKE '%supabase.co/storage%'
    AND NOT EXISTS (
      SELECT 1 FROM public.transcriptions t
      WHERE t.voice_response_id = vr.id AND t.user_id = _user_id
    )
  ORDER BY random()
  LIMIT 1;
$$;
