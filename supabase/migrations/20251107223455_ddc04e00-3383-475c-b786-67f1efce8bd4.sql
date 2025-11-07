-- Drop all policies from workspaces table
DROP POLICY IF EXISTS "Allow authenticated users to select workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to insert workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to delete workspaces" ON workspaces;

-- Drop all policies from workspace_members table
DROP POLICY IF EXISTS "Allow authenticated users to select workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated users to insert workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated users to update workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated users to delete workspace_members" ON workspace_members;