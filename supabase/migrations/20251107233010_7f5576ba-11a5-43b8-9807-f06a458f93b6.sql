-- Migration: Fix onboarding tracking and add title field
-- This migration:
-- 1. Adds onboarding_completed to user_preferences (correct location)
-- 2. Adds title field to users table
-- 3. Backfills user_preferences for existing users
-- 4. Creates auto-creation trigger for new users
-- 5. Removes onboarding_completed from users table (wrong location)

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

-- Step 4: Create auto-creation trigger for new users
CREATE OR REPLACE FUNCTION public.auto_create_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, onboarding_completed)
  VALUES (NEW.id, FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_created_preferences ON public.users;

-- Create trigger to auto-create user_preferences for new users
CREATE TRIGGER on_user_created_preferences
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_user_preferences();

-- Step 5: Remove onboarding_completed from users table (wrong location)
ALTER TABLE public.users 
DROP COLUMN IF EXISTS onboarding_completed;