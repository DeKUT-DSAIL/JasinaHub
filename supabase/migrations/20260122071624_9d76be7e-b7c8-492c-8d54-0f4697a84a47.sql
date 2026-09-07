-- Add column to track if phone number has been updated
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number_updated boolean NOT NULL DEFAULT false;