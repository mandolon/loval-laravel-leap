-- Add hidden_line_mode column to model_settings table
ALTER TABLE public.model_settings 
ADD COLUMN IF NOT EXISTS hidden_line_mode BOOLEAN NOT NULL DEFAULT false;
