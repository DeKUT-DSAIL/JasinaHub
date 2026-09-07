-- Partial unique index to ensure only one active (pending/accepted) transcription per recording
CREATE UNIQUE INDEX IF NOT EXISTS transcriptions_voice_response_id_unique_active 
ON public.transcriptions (voice_response_id) 
WHERE status != 'rejected';

-- Update claim function to exclude any recording already transcribed globally (unless rejected)
CREATE OR REPLACE FUNCTION public.claim_random_transcription(_user_id uuid)
RETURNS TABLE(id uuid, audio_file_url text, question_id uuid, duration_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record RECORD;
BEGIN
  -- Clean up expired locks first
  DELETE FROM public.transcription_locks WHERE expires_at < now();

  -- Find a random unclaimed, unlocked recording
  SELECT vr.id, vr.audio_file_url, vr.question_id, vr.duration_seconds
  INTO _record
  FROM public.voice_responses vr
  WHERE vr.status = 'accepted'
    AND vr.user_id != _user_id
    AND vr.audio_file_url IS NOT NULL
    AND vr.audio_file_url LIKE '%supabase.co/storage%'
    -- Exclude if ANY active transcription exists (globally)
    AND NOT EXISTS (
      SELECT 1 FROM public.transcriptions t
      WHERE t.voice_response_id = vr.id 
        AND t.status IN ('accepted', 'pending')
    )
    -- Exclude if locked by someone else (or current user's previous attempt)
    AND NOT EXISTS (
      SELECT 1 FROM public.transcription_locks tl
      WHERE tl.voice_response_id = vr.id
    )
  ORDER BY random()
  LIMIT 1;

  IF _record IS NULL THEN
    RETURN;
  END IF;

  -- Release any existing lock by this user
  DELETE FROM public.transcription_locks WHERE user_id = _user_id;

  -- Lock the chosen recording
  INSERT INTO public.transcription_locks (voice_response_id, user_id)
  VALUES (_record.id, _user_id);

  -- Return the result
  id := _record.id;
  audio_file_url := _record.audio_file_url;
  question_id := _record.question_id;
  duration_seconds := _record.duration_seconds;
  RETURN NEXT;
END;
$$;
