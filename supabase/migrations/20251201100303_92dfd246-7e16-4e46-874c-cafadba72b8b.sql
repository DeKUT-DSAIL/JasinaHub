-- Add image_attribution column to questions table
ALTER TABLE public.questions
ADD COLUMN image_attribution text;