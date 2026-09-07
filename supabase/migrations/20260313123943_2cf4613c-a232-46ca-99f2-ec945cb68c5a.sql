
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS transcription_guidelines_agreed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS transcription_guidelines_agreed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS transcription_approved boolean NOT NULL DEFAULT false;
