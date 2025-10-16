-- Add title column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title TEXT;