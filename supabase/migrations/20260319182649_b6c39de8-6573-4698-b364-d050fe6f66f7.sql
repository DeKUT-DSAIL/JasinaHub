CREATE POLICY "Users can update own pending/rejected transcriptions"
ON public.transcriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status != 'accepted')
WITH CHECK (auth.uid() = user_id AND status != 'accepted');