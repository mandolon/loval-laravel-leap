-- Add onboarding tracking to user_preferences table
-- Only TEAM users will go through onboarding flow

-- Add onboarding_completed column
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding 
ON public.user_preferences(onboarding_completed) 
WHERE onboarding_completed = FALSE;

-- Backfill existing users to skip onboarding (they're already using the app)
UPDATE public.user_preferences 
SET onboarding_completed = TRUE 
WHERE onboarding_completed IS NULL;

-- Set default for future inserts
ALTER TABLE public.user_preferences 
ALTER COLUMN onboarding_completed SET DEFAULT FALSE;

COMMENT ON COLUMN public.user_preferences.onboarding_completed IS 'Whether user has completed the onboarding flow (TEAM users only)';
