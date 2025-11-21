-- Function to delete all sessions for a specific user
-- This is used by the force-signout edge function to invalidate user sessions

CREATE OR REPLACE FUNCTION delete_user_sessions(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete all sessions for the target user from auth.sessions
  DELETE FROM auth.sessions
  WHERE user_id = target_user_id;
  
  -- Also delete refresh tokens
  DELETE FROM auth.refresh_tokens
  WHERE user_id = target_user_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION delete_user_sessions(UUID) TO service_role;

COMMENT ON FUNCTION delete_user_sessions IS 'Admin function to forcefully sign out a user by deleting all their sessions and refresh tokens';