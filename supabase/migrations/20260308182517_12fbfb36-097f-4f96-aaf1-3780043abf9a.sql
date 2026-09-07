-- Make voice-recordings bucket public for audio playback
UPDATE storage.buckets SET public = true WHERE id = 'voice-recordings';

-- Allow public read access to voice-recordings
CREATE POLICY "Public read access for voice recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-recordings');

-- Allow service role (edge functions) to insert files
CREATE POLICY "Service role can upload voice recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-recordings');