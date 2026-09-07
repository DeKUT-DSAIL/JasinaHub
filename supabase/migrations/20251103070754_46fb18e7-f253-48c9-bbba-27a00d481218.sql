-- Create images storage bucket for question images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload question images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update question images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete question images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view question images" ON storage.objects;

-- Create RLS policies for images bucket
-- Allow admins to upload images
CREATE POLICY "Admins can upload question images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = 'question-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update images
CREATE POLICY "Admins can update question images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = 'question-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete images
CREATE POLICY "Admins can delete question images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = 'question-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow everyone to view images (public bucket)
CREATE POLICY "Anyone can view question images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = 'question-images');