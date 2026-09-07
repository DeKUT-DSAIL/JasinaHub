-- Allow authenticated users to insert their own voice recordings
CREATE POLICY "Users can upload their own voice recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to select their own voice recordings
CREATE POLICY "Users can view their own voice recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own voice recordings
CREATE POLICY "Users can update their own voice recordings"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voice-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all voice recordings
CREATE POLICY "Admins can view all voice recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-recordings' 
  AND has_role(auth.uid(), 'admin'::app_role)
);