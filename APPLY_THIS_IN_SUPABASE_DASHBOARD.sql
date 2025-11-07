-- ==========================================
-- EMERGENCY FIX FOR 500 SIGNUP ERROR
-- Apply this ENTIRE script in Supabase Dashboard SQL Editor
-- ==========================================

-- Step 1: Add onboarding_completed to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding 
ON public.user_preferences(onboarding_completed) 
WHERE onboarding_completed = FALSE;

-- Comment for documentation
COMMENT ON COLUMN public.user_preferences.onboarding_completed 
IS 'Whether user has completed the onboarding flow (TEAM users only)';

-- Step 2: Add title field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.users.title 
IS 'User job title (e.g., Architect, Designer, Project Manager)';

-- Step 3: Create user_preferences for existing users who don't have them
INSERT INTO public.user_preferences (user_id, onboarding_completed)
SELECT id, true  -- Set to true for existing users (they skip onboarding)
FROM public.users
WHERE deleted_at IS NULL
AND id NOT IN (SELECT user_id FROM public.user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Remove onboarding_completed from users table (wrong location)
ALTER TABLE public.users 
DROP COLUMN IF EXISTS onboarding_completed;

-- Step 5: Update handle_new_user function to use avatar colors
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

  -- Insert into users table (NO onboarding_completed - it's in user_preferences now)
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

-- Step 6: Create auto_create_user_preferences function
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

-- Step 7: Create trigger to auto-create user_preferences
DROP TRIGGER IF EXISTS on_user_created_preferences ON public.users;

CREATE TRIGGER on_user_created_preferences
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_user_preferences();

-- ==========================================
-- DONE! Now test user signup
-- ==========================================
