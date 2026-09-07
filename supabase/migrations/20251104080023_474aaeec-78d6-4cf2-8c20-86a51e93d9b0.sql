-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Verified users can insert their own responses" ON voice_responses;

-- Create new INSERT policy that allows both verified users AND admins
CREATE POLICY "Verified users and admins can insert their own responses"
ON voice_responses
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) 
  AND 
  (
    -- Either the user is verified
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.verified = true
    ))
    -- OR the user is an admin
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);