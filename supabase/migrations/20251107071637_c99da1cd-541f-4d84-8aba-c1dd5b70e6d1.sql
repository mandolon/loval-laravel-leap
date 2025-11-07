-- Step 1: Clean up orphaned workspace_members (no matching user)
DELETE FROM workspace_members
WHERE user_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL);

-- Step 2: Clean up orphaned project_members (no matching user)
DELETE FROM project_members
WHERE user_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL);

-- Step 3: Add proper foreign key constraints with CASCADE for workspace_members
ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey,
ADD CONSTRAINT workspace_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- Step 4: Add proper foreign key constraints with CASCADE for project_members
ALTER TABLE project_members
DROP CONSTRAINT IF EXISTS project_members_user_id_fkey,
ADD CONSTRAINT project_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- Step 5: Create function to clean up user relations on soft delete
CREATE OR REPLACE FUNCTION cleanup_user_relations()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Soft delete workspace memberships
    UPDATE workspace_members 
    SET deleted_at = NEW.deleted_at, deleted_by = NEW.deleted_by
    WHERE user_id = NEW.id AND deleted_at IS NULL;
    
    -- Soft delete project memberships
    UPDATE project_members 
    SET deleted_at = NEW.deleted_at, deleted_by = NEW.deleted_by
    WHERE user_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 6: Attach trigger to users table
DROP TRIGGER IF EXISTS on_user_soft_delete ON users;
CREATE TRIGGER on_user_soft_delete
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_user_relations();

-- Step 7: Create function to clean up workspace relations on soft delete
CREATE OR REPLACE FUNCTION cleanup_workspace_relations()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Soft delete workspace memberships
    UPDATE workspace_members 
    SET deleted_at = NEW.deleted_at
    WHERE workspace_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 8: Attach trigger to workspaces table
DROP TRIGGER IF EXISTS on_workspace_soft_delete ON workspaces;
CREATE TRIGGER on_workspace_soft_delete
  AFTER UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_workspace_relations();