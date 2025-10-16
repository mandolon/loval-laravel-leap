-- =====================================================
-- PHASE 8: Global Admin + Workspace-Scoped Roles (Fixed)
-- =====================================================

BEGIN;

-- 1. Add is_admin column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Migrate existing admin workspace members to global admins
UPDATE users
SET is_admin = true
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM workspace_members 
  WHERE role = 'admin'
    AND deleted_at IS NULL
);

-- 3. Migrate 'admin' and 'member' roles to 'team' FIRST (before constraint change)
UPDATE workspace_members
SET role = 'team'
WHERE role IN ('admin', 'member');

-- 4. NOW update workspace_members.role constraint (remove 'admin')
ALTER TABLE workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check,
  ADD CONSTRAINT workspace_members_role_check 
    CHECK (role IN ('team', 'consultant', 'client'));

-- 5. Ensure short_id has default
ALTER TABLE workspace_members
  ALTER COLUMN short_id SET DEFAULT generate_short_id('WM'::text);

-- Backfill missing short_ids
UPDATE workspace_members
SET short_id = generate_short_id('WM'::text)
WHERE short_id IS NULL;

-- 6. Drop legacy user_roles and app_role
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 7. Add indexes
CREATE INDEX IF NOT EXISTS idx_users_is_admin 
  ON users(is_admin) WHERE is_admin = true;

CREATE INDEX IF NOT EXISTS idx_workspace_members_active 
  ON workspace_members(workspace_id, user_id) 
  WHERE deleted_at IS NULL;

-- 8. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_name TEXT;
  user_initials TEXT;
BEGIN
  -- Extract name from metadata
  user_name := COALESCE(
    new.raw_user_meta_data->>'name',
    TRIM(COALESCE(new.raw_user_meta_data->>'first_name', '') || ' ' || 
         COALESCE(new.raw_user_meta_data->>'last_name', '')),
    SPLIT_PART(new.email, '@', 1)
  );
  
  -- Generate initials
  user_initials := UPPER(
    LEFT(SPLIT_PART(user_name, ' ', 1), 1) || 
    COALESCE(LEFT(SPLIT_PART(user_name, ' ', 2), 1), 
             LEFT(SPLIT_PART(user_name, ' ', 1), 2, 1))
  );
  
  -- Insert into users table
  INSERT INTO public.users (
    auth_id,
    name, 
    email,
    avatar_url,
    is_admin
  )
  VALUES (
    new.id,
    user_name,
    new.email,
    'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)',
    false
  );
  
  RETURN new;
END;
$$;

COMMIT;