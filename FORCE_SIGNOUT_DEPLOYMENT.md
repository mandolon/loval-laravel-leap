# Force Sign-Out Implementation - Deployment Steps

## Summary
Admin users can now force sign out other users from the User Management page. This immediately invalidates all their active sessions.

## What You Need to Do

### 1. Run Database Migration
Go to Supabase Dashboard → SQL Editor and run:

```sql
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
```

### 2. Deploy Edge Function
Run this command in terminal:

```bash
npx supabase functions deploy force-signout
```

### 3. Test
1. Go to User Management page (Admin only)
2. Click "Sign Out" button next to any user
3. User should be immediately signed out and unable to access the app until they sign in again

## What This Does
- ✅ Deletes all active sessions for the target user
- ✅ Removes all refresh tokens
- ✅ Forces immediate logout (user needs to sign in again)
- ✅ Admin only - requires admin privileges to use

## Files Changed
- `supabase/functions/force-signout/index.ts` - Updated edge function logic
- `supabase/migrations/20251120000002_force_signout_function.sql` - New database function
- Frontend code already in place (no changes needed)
