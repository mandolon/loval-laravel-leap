-- Update handle_new_user to use solid color instead of gradient for avatar_url
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
  new_user_id UUID;
  avatar_colors TEXT[] := ARRAY['#202020', '#6E56CF', '#98A2FF', '#E54D2E', '#E93D82', '#E2991A', '#1EAEDB', '#3E6C59', '#8E7E73', '#2EB67D', '#2BB0A2'];
  random_color TEXT;
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
  
  -- Select random color from avatar_colors array
  random_color := avatar_colors[1 + floor(random() * array_length(avatar_colors, 1))];
  
  -- Insert into users table and capture the generated ID
  INSERT INTO public.users (
    auth_id,
    name, 
    email,
    avatar_url,
    is_admin,
    onboarding_completed
  )
  VALUES (
    new.id,
    user_name,
    new.email,
    random_color,
    false,
    false
  )
  RETURNING id INTO new_user_id;
  
  -- Auto-assign to first workspace if one exists
  SELECT id INTO first_workspace_id
  FROM public.workspaces
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF first_workspace_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (first_workspace_id, new_user_id, 'team'::workspace_role);
  END IF;
  
  RETURN new;
END;
$function$;