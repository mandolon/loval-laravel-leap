-- Enable RLS on project-related tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Projects: Workspace members can view projects in their workspace
CREATE POLICY "Workspace members can view projects"
ON public.projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Projects: Workspace members can create projects in their workspace
CREATE POLICY "Workspace members can create projects"
ON public.projects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Projects: Workspace members can update projects in their workspace
CREATE POLICY "Workspace members can update projects"
ON public.projects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Project Members: Users can view project members for projects in their workspace
CREATE POLICY "Workspace members can view project members"
ON public.project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = project_members.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Project Members: Workspace members can add members to projects in their workspace
CREATE POLICY "Workspace members can create project members"
ON public.project_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = project_members.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
);

-- Project Members: Workspace members can update project members in their workspace
CREATE POLICY "Workspace members can update project members"
ON public.project_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = project_members.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
);