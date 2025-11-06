-- Phase 1b: Fix constraints and migrate data

-- Step 1: Drop the existing unique constraint on user_id (if it exists)
-- Users should be able to have only ONE role, so unique on user_id is correct
-- But we need to check if admin users already have a role entry
DO $$
BEGIN
    -- Check if we need to remove any existing role entries for admin users
    -- Admin users who already have a role entry will need special handling
    
    -- For now, we'll just insert admin role for users without any role entry
    INSERT INTO user_roles (user_id, role)
    SELECT u.id, 'admin'::app_role
    FROM users u
    WHERE u.is_admin = true
    AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
    );
END $$;

-- Step 2: Create trigger to keep is_admin boolean synced with user_roles
CREATE OR REPLACE FUNCTION sync_admin_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    UPDATE users SET is_admin = true WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle role changes
    IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
      UPDATE users SET is_admin = false WHERE id = NEW.user_id;
    ELSIF OLD.role != 'admin' AND NEW.role = 'admin' THEN
      UPDATE users SET is_admin = true WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
    UPDATE users SET is_admin = false WHERE id = OLD.user_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Step 3: Create trigger for sync
DROP TRIGGER IF EXISTS sync_admin_flag_trigger ON user_roles;
CREATE TRIGGER sync_admin_flag_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION sync_admin_flag();