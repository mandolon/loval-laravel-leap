-- Update handle_new_user to auto-assign new users to first workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_name TEXT;
  user_initials TEXT;
  first_workspace_id UUID;
BEGIN
  -- Extract name from metadata
  user_name := COALESCE(
    new.raw_user_meta_data->>'name',
    TRIM(COALESCE(new.raw_user_meta_data->>'first_name', '') || ' ' || 
         COALESCE(new.raw_user_meta_data->>'last_name', '')),
    SPLIT_PART(new.email, '@', 1)
  );
  
  -- Generate initials
  user_initials := UPPER(
    LEFT(SPLIT_PART(user_name, ' ', 1), 1) || 
    COALESCE(LEFT(SPLIT_PART(user_name, ' ', 2), 1), 
             SUBSTRING(SPLIT_PART(user_name, ' ', 1), 2, 1))
  );
  
  -- Insert into users table
  INSERT INTO public.users (
    auth_id,
    name, 
    email,
    avatar_url,
    is_admin
  )
  VALUES (
    new.id,
    user_name,
    new.email,
    'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)',
    false
  );
  
  -- Auto-assign to first workspace if one exists
  SELECT id INTO first_workspace_id
  FROM public.workspaces
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF first_workspace_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (first_workspace_id, new.id, 'team'::workspace_role);
  END IF;
  
  RETURN new;
END;
$function$;