
-- Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS dialect text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'recording_volunteer';

-- Update the handle_new_user trigger function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone_number, age, gender, dialect, account_type)
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
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    (NEW.raw_user_meta_data->>'age')::integer,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'dialect',
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'recording_volunteer')
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
