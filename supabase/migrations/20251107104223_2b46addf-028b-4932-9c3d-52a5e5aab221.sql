-- Add RLS policies for admin role management on user_roles table

-- Allow admins to insert roles
CREATE POLICY "Admins can assign roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to update roles
CREATE POLICY "Admins can update roles"
ON user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to delete roles
CREATE POLICY "Admins can revoke roles"
ON user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));