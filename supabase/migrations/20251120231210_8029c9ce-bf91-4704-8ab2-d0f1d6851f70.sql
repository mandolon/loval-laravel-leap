-- Migration 1: Add last_page_visited column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_page_visited TEXT;

CREATE INDEX IF NOT EXISTS idx_users_last_page_visited 
ON public.users(last_page_visited) 
WHERE last_page_visited IS NOT NULL;

COMMENT ON COLUMN public.users.last_page_visited 
IS 'Last main page/section user visited';

-- Migration 2: Drop and recreate RPC Function to include last_page_visited
DROP FUNCTION IF EXISTS public.get_users_with_auth_data();

CREATE OR REPLACE FUNCTION public.get_users_with_auth_data()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN,
  title TEXT,
  last_active_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  last_page_visited TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    u.avatar_url,
    u.is_admin,
    u.title,
    u.last_active_at,
    au.last_sign_in_at,
    u.last_page_visited
  FROM public.users u
  LEFT JOIN auth.users au ON u.auth_id = au.id
  WHERE u.deleted_at IS NULL
  ORDER BY u.name;
END;
$$;