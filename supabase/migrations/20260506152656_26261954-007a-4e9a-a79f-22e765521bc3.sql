CREATE OR REPLACE FUNCTION public.claim_random_transcription(_user_id uuid)
 RETURNS TABLE(id uuid, audio_file_url text, question_id uuid, duration_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _record RECORD;
BEGIN
  DELETE FROM public.transcription_locks WHERE expires_at < now();

  SELECT vr.id, vr.audio_file_url, vr.question_id, vr.duration_seconds
  INTO _record
  FROM public.voice_responses vr
  WHERE vr.status = 'accepted'
    AND vr.user_id != _user_id
    AND vr.audio_file_url IS NOT NULL
    AND vr.audio_file_url LIKE '%supabase.co/storage%'
    AND NOT EXISTS (
      SELECT 1 FROM public.transcriptions t
      WHERE t.voice_response_id = vr.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.transcription_locks tl
      WHERE tl.voice_response_id = vr.id
    )
  ORDER BY random()
  LIMIT 1;

  IF _record IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.transcription_locks WHERE user_id = _user_id;

  INSERT INTO public.transcription_locks (voice_response_id, user_id)
  VALUES (_record.id, _user_id);

  id := _record.id;
  audio_file_url := _record.audio_file_url;
  question_id := _record.question_id;
  duration_seconds := _record.duration_seconds;
  RETURN NEXT;
END;
$function$;

-- Partial unique index: enforce one transcription per recording for NEW rows only.
-- Existing duplicate rows (created before this rule) are preserved for historical performance stats.
CREATE UNIQUE INDEX IF NOT EXISTS transcriptions_voice_response_id_unique
  ON public.transcriptions(voice_response_id)
  WHERE created_at > '2026-05-06'::timestamptz;