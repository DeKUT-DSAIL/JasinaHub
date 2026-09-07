-- Add unique constraint to prevent users from answering the same question multiple times
ALTER TABLE voice_responses 
ADD CONSTRAINT voice_responses_user_question_unique 
UNIQUE (user_id, question_id);