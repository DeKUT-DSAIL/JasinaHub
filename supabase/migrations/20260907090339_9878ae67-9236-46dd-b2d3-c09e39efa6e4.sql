CREATE OR REPLACE FUNCTION public.set_profile_pseudonym()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.pseudonym IS NULL OR NEW.pseudonym = '' THEN
    NEW.pseudonym := 'JSN-' || upper(substr(md5(NEW.id::text || 'jasinahub'), 1, 7));
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET pseudonym = 'JSN-' || upper(substr(md5(id::text || 'jasinahub'), 1, 7))
WHERE pseudonym LIKE 'TH-%' OR pseudonym IS NULL OR pseudonym = '';