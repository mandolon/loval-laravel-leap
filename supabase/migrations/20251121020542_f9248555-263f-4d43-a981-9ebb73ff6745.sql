-- Drop and recreate the delete_user_sessions function with proper type handling
DROP FUNCTION IF EXISTS delete_user_sessions(UUID);

CREATE OR REPLACE FUNCTION delete_user_sessions(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete all sessions for the target user from auth.sessions
  -- Cast to text to ensure type compatibility
  DELETE FROM auth.sessions
  WHERE user_id::text = target_user_id::text;
  
  -- Also delete refresh tokens
  DELETE FROM auth.refresh_tokens
  WHERE user_id::text = target_user_id::text;
  
  -- Update last_active_at to NULL to show user as offline
  UPDATE public.users
  SET last_active_at = NULL
  WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION delete_user_sessions(UUID) TO service_role;

COMMENT ON FUNCTION delete_user_sessions IS 'Admin function to forcefully sign out a user by deleting all their sessions, refresh tokens, and clearing their online status';