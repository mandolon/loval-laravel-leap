-- Update the trigger function to handle first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_initials TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
BEGIN
  -- Extract first and last name from metadata or email
  user_first_name := COALESCE(new.raw_user_meta_data->>'first_name', SPLIT_PART(new.email, '@', 1));
  user_last_name := COALESCE(new.raw_user_meta_data->>'last_name', '');
  
  -- Generate initials
  IF user_last_name != '' THEN
    user_initials := UPPER(LEFT(user_first_name, 1) || LEFT(user_last_name, 1));
  ELSE
    user_initials := UPPER(LEFT(user_first_name, 2));
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (id, first_name, last_name, email, initials, avatar)
  VALUES (
    new.id,
    user_first_name,
    user_last_name,
    new.email,
    user_initials,
    'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)'
  );
  
  -- Assign default role (team)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'team');
  
  RETURN new;
END;
$$;