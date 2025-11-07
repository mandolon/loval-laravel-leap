-- Set onboarding_completed to true for all existing users
-- Users created before the onboarding feature was added should skip it
UPDATE public.users 
SET onboarding_completed = true 
WHERE created_at < '2025-11-07 21:30:00+00';