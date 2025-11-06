-- Add workspace member roles
-- Create enum for workspace member roles (team, consultant, client)
CREATE TYPE public.workspace_role AS ENUM ('team', 'consultant', 'client');

-- Add role column to workspace_members table
ALTER TABLE public.workspace_members
ADD COLUMN role public.workspace_role NOT NULL DEFAULT 'team';

-- Create index for role-based queries
CREATE INDEX idx_workspace_members_role ON public.workspace_members(workspace_id, role) 
WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.workspace_members.role IS 'Workspace-scoped role: team (full access), consultant (limited access), client (view only)';