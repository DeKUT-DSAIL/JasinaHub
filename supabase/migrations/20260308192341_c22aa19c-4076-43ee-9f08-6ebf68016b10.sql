
-- Create transcriptions table
CREATE TABLE public.transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_response_id uuid NOT NULL REFERENCES public.voice_responses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  transcription_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own transcriptions
CREATE POLICY "Users can insert own transcriptions"
  ON public.transcriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own transcriptions
CREATE POLICY "Users can view own transcriptions"
  ON public.transcriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all transcriptions
CREATE POLICY "Admins can view all transcriptions"
  ON public.transcriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RPC: claim a random recording for transcription (excludes own recordings and already-transcribed ones)
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
    AND NOT EXISTS (
      SELECT 1 FROM public.transcriptions t
      WHERE t.voice_response_id = vr.id AND t.user_id = _user_id
    )
  ORDER BY random()
  LIMIT 1;
$$;
