-- Drop the duplicate foreign key constraints we just added
-- These are redundant since workspace_members already has existing FK constraints
ALTER TABLE public.workspace_members
DROP CONSTRAINT IF EXISTS fk_workspace_members_workspace;

ALTER TABLE public.workspace_members
DROP CONSTRAINT IF EXISTS fk_workspace_members_user;