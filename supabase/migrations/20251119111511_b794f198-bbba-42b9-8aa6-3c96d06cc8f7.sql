-- Update the handle_new_user function to better handle Google OAuth data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle both regular signup (with first_name/last_name) and Google OAuth
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
      NULLIF(SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 2), ''),
      ''
    ),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  RETURN NEW;
END;
$function$;