-- Enable RLS on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Enable RLS on workspace_members table
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Permissive policies for workspaces (allow all authenticated users)
CREATE POLICY "Allow authenticated users to select workspaces"
ON workspaces FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert workspaces"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workspaces"
ON workspaces FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete workspaces"
ON workspaces FOR DELETE
TO authenticated
USING (true);

-- Permissive policies for workspace_members (allow all authenticated users)
CREATE POLICY "Allow authenticated users to select workspace_members"
ON workspace_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert workspace_members"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workspace_members"
ON workspace_members FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete workspace_members"
ON workspace_members FOR DELETE
TO authenticated
USING (true);