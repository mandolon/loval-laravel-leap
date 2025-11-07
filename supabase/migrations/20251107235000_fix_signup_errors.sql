-- Migration: Fix 500 error during user signup
-- Problem: handle_new_user was using gradient avatar, but we need to use the avatar colors array
-- Solution: Update handle_new_user to randomly select from the 11 avatar colors

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Insert into users table (WITHOUT onboarding_completed - it's in user_preferences now)
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
    random_color,  -- Use random solid color from our palette
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
$$;

-- Ensure the auto_create_user_preferences trigger is active
-- (This should already exist from 20251107233010 migration, but we recreate it to be safe)

CREATE OR REPLACE FUNCTION public.auto_create_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-create user_preferences with onboarding_completed = false for new users
  INSERT INTO public.user_preferences (user_id, onboarding_completed)
  VALUES (NEW.id, FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure it's properly registered
DROP TRIGGER IF EXISTS on_user_created_preferences ON public.users;

CREATE TRIGGER on_user_created_preferences
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_user_preferences();
