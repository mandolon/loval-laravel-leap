-- Enable RLS on workspaces table (if not already enabled)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Allow users to view workspaces they are members of
CREATE POLICY "Users can view workspaces they belong to"
ON workspaces
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.deleted_at IS NULL
  )
);

-- Allow authenticated users to create workspaces
CREATE POLICY "Authenticated users can create workspaces"
ON workspaces
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow workspace team members to update their workspace
CREATE POLICY "Team members can update workspace"
ON workspaces
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'team'
    AND workspace_members.deleted_at IS NULL
  )
);

-- Allow workspace team members to delete their workspace
CREATE POLICY "Team members can delete workspace"
ON workspaces
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'team'
    AND workspace_members.deleted_at IS NULL
  )
);

-- Enable RLS on workspace_members table
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Allow users to view workspace members for workspaces they belong to
CREATE POLICY "Users can view members of their workspaces"
ON workspace_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Allow team members to add members to their workspace
CREATE POLICY "Team members can add workspace members"
ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspace_members.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'team'
    AND workspace_members.deleted_at IS NULL
  )
  OR NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspace_members.workspace_id
  )
);

-- Allow team members to update workspace members
CREATE POLICY "Team members can update workspace members"
ON workspace_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'team'
    AND wm.deleted_at IS NULL
  )
);

-- Allow team members to soft-delete workspace members
CREATE POLICY "Team members can remove workspace members"
ON workspace_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'team'
    AND wm.deleted_at IS NULL
  )
);