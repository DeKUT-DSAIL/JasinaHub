-- Update the handle_new_user function to support both regular signup and Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle both regular signup (with first_name/last_name) and Google OAuth (with full_name or given_name/family_name)
  INSERT INTO public.profiles (id, first_name, last_name, email, phone_number)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'given_name',
      SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'family_name',
      SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 2),
      ''
    ),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  RETURN NEW;
END;
$$;