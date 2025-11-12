-- Create secure function to get users with auth data (NO RLS)
CREATE OR REPLACE FUNCTION public.get_users_with_auth_data()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN,
  title TEXT,
  last_active_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
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
    au.last_sign_in_at
  FROM public.users u
  LEFT JOIN auth.users au ON u.auth_id = au.id
  WHERE u.deleted_at IS NULL
  ORDER BY u.name;
END;
$$;