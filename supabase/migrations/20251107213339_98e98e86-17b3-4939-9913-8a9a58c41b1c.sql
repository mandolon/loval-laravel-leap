-- Add onboarding_completed field to users table
ALTER TABLE public.users 
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;