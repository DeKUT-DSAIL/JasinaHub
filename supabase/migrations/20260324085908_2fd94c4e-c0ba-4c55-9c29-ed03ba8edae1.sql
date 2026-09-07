CREATE POLICY "Transcribers can view responses they transcribed"
ON public.voice_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transcriptions t
    WHERE t.voice_response_id = voice_responses.id
      AND t.user_id = auth.uid()
  )
);