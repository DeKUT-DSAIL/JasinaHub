-- Add status enum type
CREATE TYPE public.response_status AS ENUM ('pending', 'accepted', 'rejected');

-- Add status column to voice_responses
ALTER TABLE public.voice_responses
ADD COLUMN status public.response_status NOT NULL DEFAULT 'pending';

-- Update RLS policy to allow admins to update status
CREATE POLICY "Admins can update response status"
ON public.voice_responses
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));