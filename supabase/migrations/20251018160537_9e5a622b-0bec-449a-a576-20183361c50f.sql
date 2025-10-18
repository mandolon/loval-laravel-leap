-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Team members can add workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Team members can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Team members can remove workspace members" ON workspace_members;

-- Create a security definer function to check workspace membership
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = _user_id
    AND deleted_at IS NULL
  )
$$;

-- Create a security definer function to check if user is a team member
CREATE OR REPLACE FUNCTION public.is_workspace_team_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = _user_id
    AND role = 'team'
    AND deleted_at IS NULL
  )
$$;

-- Create a security definer function to check if workspace has no members (for initial creation)
CREATE OR REPLACE FUNCTION public.workspace_has_no_members(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND deleted_at IS NULL
  )
$$;

-- Now create the fixed policies using the helper functions

-- Allow users to view workspace members for workspaces they belong to
CREATE POLICY "Users can view members of their workspaces"
ON workspace_members
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
);

-- Allow team members to add members OR allow first member to be added to empty workspace
CREATE POLICY "Team members can add workspace members"
ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_team_member(auth.uid(), workspace_id)
  OR public.workspace_has_no_members(workspace_id)
);

-- Allow team members to update workspace members
CREATE POLICY "Team members can update workspace members"
ON workspace_members
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_team_member(auth.uid(), workspace_id)
);

-- Allow team members to soft-delete workspace members
CREATE POLICY "Team members can remove workspace members"
ON workspace_members
FOR DELETE
TO authenticated
USING (
  public.is_workspace_team_member(auth.uid(), workspace_id)
);