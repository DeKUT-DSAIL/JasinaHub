-- Add consent tracking field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS voice_recording_consent BOOLEAN DEFAULT FALSE;

-- Add consent timestamp for audit purposes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP WITH TIME ZONE;