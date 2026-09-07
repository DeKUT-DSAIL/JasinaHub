
-- Create transcription_locks table for exclusive recording claims
CREATE TABLE public.transcription_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_response_id uuid NOT NULL REFERENCES public.voice_responses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  locked_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes'),
  UNIQUE (voice_response_id)
);

-- Enable RLS
ALTER TABLE public.transcription_locks ENABLE ROW LEVEL SECURITY;

-- Users can view their own locks
CREATE POLICY "Users can view own locks" ON public.transcription_locks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert locks
CREATE POLICY "Users can insert locks" ON public.transcription_locks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own locks (release)
CREATE POLICY "Users can delete own locks" ON public.transcription_locks
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can manage all locks
CREATE POLICY "Admins can manage locks" ON public.transcription_locks
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Replace claim function to atomically lock and exclude locked recordings
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
    AND NOT EXISTS (
      SELECT 1 FROM public.transcriptions t
      WHERE t.voice_response_id = vr.id AND t.user_id = _user_id
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

-- Create a function to release a lock
CREATE OR REPLACE FUNCTION public.release_transcription_lock(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.transcription_locks
  WHERE user_id = _user_id;
$$;
