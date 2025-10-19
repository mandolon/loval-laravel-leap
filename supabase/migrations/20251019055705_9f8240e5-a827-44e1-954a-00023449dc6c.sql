-- Drop all existing RLS policies from workspaces
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Team members can delete workspace" ON workspaces;
DROP POLICY IF EXISTS "Team members can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;

-- Drop all existing RLS policies from workspace_members
DROP POLICY IF EXISTS "Team members can add workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Team members can remove workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Team members can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;

-- Drop all existing RLS policies from users
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Drop all existing RLS policies from files
DROP POLICY IF EXISTS "Users can delete their uploaded files" ON files;
DROP POLICY IF EXISTS "Users can update their uploaded files" ON files;
DROP POLICY IF EXISTS "Workspace members can upload files to projects" ON files;
DROP POLICY IF EXISTS "Workspace members can view project files" ON files;

-- Drop all existing RLS policies from folders
DROP POLICY IF EXISTS "Workspace members can create folders in projects" ON folders;
DROP POLICY IF EXISTS "Workspace members can view project folders" ON folders;

-- Disable RLS on all tables (UI-based access control)
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;

-- Update workspace_members role constraint to exclude 'admin'
-- Admins are now system-level (users.is_admin boolean)
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
  CHECK (role IN ('team', 'consultant', 'client'));

-- Ensure users.is_admin column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;