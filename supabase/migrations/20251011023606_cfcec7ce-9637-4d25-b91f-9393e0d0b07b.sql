-- Add text response capability to voice_responses table
ALTER TABLE voice_responses ADD COLUMN text_response TEXT;
ALTER TABLE voice_responses ADD COLUMN response_type TEXT CHECK (response_type IN ('voice', 'text')) DEFAULT 'voice';
ALTER TABLE voice_responses ALTER COLUMN audio_file_url DROP NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_voice_responses_user_id ON voice_responses(user_id);
CREATE INDEX idx_voice_responses_question_id ON voice_responses(question_id);

-- Update RLS policies to allow users to view their own responses
-- (already exists, just ensuring it's correct)