-- Enable RLS on files table (if not already enabled)
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Enable RLS on folders table (if not already enabled)
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow workspace members to SELECT files from their projects
CREATE POLICY "Workspace members can view project files"
ON public.files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    INNER JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE p.id = files.project_id
      AND wm.user_id = auth.uid()
      AND wm.deleted_at IS NULL
      AND p.deleted_at IS NULL
  )
);

-- Create policy to allow workspace members to INSERT files to their projects
CREATE POLICY "Workspace members can upload files to projects"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    INNER JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE p.id = files.project_id
      AND wm.user_id = auth.uid()
      AND wm.deleted_at IS NULL
      AND p.deleted_at IS NULL
  )
);

-- Create policy to allow users to UPDATE their own uploaded files
CREATE POLICY "Users can update their uploaded files"
ON public.files
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Create policy to allow users to soft-delete their own files
CREATE POLICY "Users can delete their uploaded files"
ON public.files
FOR UPDATE
TO authenticated
USING (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.projects p
    INNER JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE p.id = files.project_id
      AND wm.user_id = auth.uid()
      AND wm.deleted_at IS NULL
  )
);

-- Create policy to allow workspace members to SELECT folders from their projects
CREATE POLICY "Workspace members can view project folders"
ON public.folders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    INNER JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE p.id = folders.project_id
      AND wm.user_id = auth.uid()
      AND wm.deleted_at IS NULL
      AND p.deleted_at IS NULL
  )
);

-- Create policy to allow workspace members to INSERT folders to their projects
CREATE POLICY "Workspace members can create folders in projects"
ON public.folders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    INNER JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE p.id = folders.project_id
      AND wm.user_id = auth.uid()
      AND wm.deleted_at IS NULL
      AND p.deleted_at IS NULL
  )
);