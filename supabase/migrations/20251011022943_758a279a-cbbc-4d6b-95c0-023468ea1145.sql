-- Create storage bucket for voice recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for voice-recordings bucket
CREATE POLICY "Users can upload their own recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'voice-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'voice-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'voice-recordings' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete their own recordings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'voice-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);