-- Add verified status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN verified BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policies for questions to require verification
DROP POLICY IF EXISTS "Everyone can view questions" ON public.questions;
CREATE POLICY "Verified users can view questions" 
ON public.questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND verified = true
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Update RLS policies for voice_responses to require verification
DROP POLICY IF EXISTS "Users can insert their own responses" ON public.voice_responses;
CREATE POLICY "Verified users can insert their own responses" 
ON public.voice_responses 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND verified = true
  )
);

DROP POLICY IF EXISTS "Users can view their own responses" ON public.voice_responses;
CREATE POLICY "Verified users can view their own responses" 
ON public.voice_responses 
FOR SELECT 
USING (
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND verified = true
  ))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Update RLS policies for user_progress to require verification
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
CREATE POLICY "Verified users can view their own progress" 
ON public.user_progress 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND verified = true
  )
);

DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_progress;
CREATE POLICY "Verified users can insert their own progress" 
ON public.user_progress 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND verified = true
  )
);

DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
CREATE POLICY "Verified users can update their own progress" 
ON public.user_progress 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND verified = true
  )
);

-- Allow admins to update user verification status
CREATE POLICY "Admins can update profile verification" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));