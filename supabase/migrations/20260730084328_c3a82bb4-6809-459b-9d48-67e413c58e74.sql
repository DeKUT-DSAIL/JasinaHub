ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pseudonym text;

CREATE OR REPLACE FUNCTION public.set_profile_pseudonym()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pseudonym IS NULL OR NEW.pseudonym = '' THEN
    NEW.pseudonym := 'TH-' || upper(substr(encode(digest(NEW.id::text || 'tunuhub', 'sha256'), 'hex'), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_profile_pseudonym()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.pseudonym IS NULL OR NEW.pseudonym = '' THEN
    NEW.pseudonym := 'TH-' || upper(substr(md5(NEW.id::text || 'tunuhub'), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_pseudonym_trigger ON public.profiles;
CREATE TRIGGER set_profile_pseudonym_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_pseudonym();

UPDATE public.profiles
SET pseudonym = 'TH-' || upper(substr(md5(id::text || 'tunuhub'), 1, 8))
WHERE pseudonym IS NULL OR pseudonym = '';

ALTER TABLE public.profiles ALTER COLUMN pseudonym SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pseudonym_key ON public.profiles (pseudonym);