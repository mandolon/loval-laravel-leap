-- Disable RLS on workspaces table
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;

-- Disable RLS on workspace_members table  
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;