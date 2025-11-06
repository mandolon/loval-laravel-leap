-- Fix workspace deletion by enabling CASCADE delete for drawings
-- Drop existing constraint that was blocking workspace deletion
ALTER TABLE public.drawings 
DROP CONSTRAINT IF EXISTS drawings_workspace_id_fkey;

-- Recreate constraint with CASCADE delete behavior
-- This allows drawings to be automatically deleted when their workspace is removed
ALTER TABLE public.drawings
ADD CONSTRAINT drawings_workspace_id_fkey
FOREIGN KEY (workspace_id)
REFERENCES public.workspaces(id)
ON DELETE CASCADE;