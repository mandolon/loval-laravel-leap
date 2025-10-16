-- Phase 5: Schema Alignment Fixes (Using temp column approach)

-- Fix user_preferences.email_digest: text -> boolean
-- Add temp column
ALTER TABLE public.user_preferences 
  ADD COLUMN email_digest_new boolean DEFAULT false;

-- Copy data with conversion
UPDATE public.user_preferences 
SET email_digest_new = (
  CASE 
    WHEN email_digest IS NULL OR email_digest = '' THEN false
    ELSE true
  END
);

-- Drop old column and rename new
ALTER TABLE public.user_preferences DROP COLUMN email_digest;
ALTER TABLE public.user_preferences RENAME COLUMN email_digest_new TO email_digest;

-- Change theme default to 'light'
ALTER TABLE public.user_preferences 
  ALTER COLUMN theme SET DEFAULT 'light';

-- Fix workspace_settings.default_invoice_terms: text -> integer
-- Add temp column
ALTER TABLE public.workspace_settings 
  ADD COLUMN default_invoice_terms_new integer DEFAULT 30;

-- Copy data with conversion
UPDATE public.workspace_settings 
SET default_invoice_terms_new = (
  CASE 
    WHEN default_invoice_terms IS NULL THEN NULL
    WHEN default_invoice_terms ~ '^\d+$' THEN default_invoice_terms::integer
    ELSE 30
  END
);

-- Drop old column and rename new
ALTER TABLE public.workspace_settings DROP COLUMN default_invoice_terms;
ALTER TABLE public.workspace_settings RENAME COLUMN default_invoice_terms_new TO default_invoice_terms;

-- Add comments
COMMENT ON COLUMN public.user_preferences.email_digest IS 'Whether email digest notifications are enabled';
COMMENT ON COLUMN public.user_preferences.theme IS 'UI theme preference: light, dark, or system';
COMMENT ON COLUMN public.workspace_settings.default_invoice_terms IS 'Default payment terms in days (e.g., 30 for Net 30)';