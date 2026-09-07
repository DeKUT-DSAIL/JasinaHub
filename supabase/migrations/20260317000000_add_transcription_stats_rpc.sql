-- RPC to get question transcription stats for admin panel
CREATE OR REPLACE FUNCTION public.get_question_transcription_stats()
RETURNS TABLE(
  question_id uuid,
  transcription_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vr.question_id, count(t.id) as transcription_count
  FROM public.voice_responses vr
  JOIN public.transcriptions t ON t.voice_response_id = vr.id
  GROUP BY vr.question_id;
$$;
