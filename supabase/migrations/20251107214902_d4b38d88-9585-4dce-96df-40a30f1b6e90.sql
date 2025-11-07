-- Add foreign key constraints to workspace_members table
ALTER TABLE public.workspace_members
ADD CONSTRAINT fk_workspace_members_user
FOREIGN KEY (user_id) 
REFERENCES public.users(id)
ON DELETE CASCADE;

ALTER TABLE public.workspace_members
ADD CONSTRAINT fk_workspace_members_workspace
FOREIGN KEY (workspace_id)
REFERENCES public.workspaces(id)
ON DELETE CASCADE;