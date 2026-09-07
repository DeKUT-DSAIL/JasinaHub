
-- New unified stats RPC for the admin dashboard
CREATE OR REPLACE FUNCTION public.get_transcription_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'unique_transcribed', (
      SELECT COUNT(DISTINCT voice_response_id)
      FROM public.transcriptions
      WHERE status <> 'rejected'
    ),
    'verified_unique', (
      SELECT COUNT(DISTINCT voice_response_id)
      FROM public.transcriptions
      WHERE status = 'accepted'
    ),
    'pending_unique', (
      SELECT COUNT(DISTINCT t.voice_response_id)
      FROM public.transcriptions t
      WHERE t.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM public.transcriptions t2
          WHERE t2.voice_response_id = t.voice_response_id
            AND t2.status = 'accepted'
        )
    ),
    'accepted_migrated', (
      SELECT COUNT(*) FROM public.voice_responses
      WHERE status = 'accepted'
        AND audio_file_url ILIKE '%supabase.co/storage%'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Update claim function: each recording is offered to only one transcriber,
-- and never re-offered after it has any non-rejected transcription.
CREATE OR REPLACE FUNCTION public.claim_random_transcription(_user_id uuid)
RETURNS TABLE(id uuid, audio_file_url text, question_id uuid, duration_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        AND t.status <> 'rejected'
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
$$;
