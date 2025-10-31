-- Enable RLS on drawings tables
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_scales ENABLE ROW LEVEL SECURITY;

-- Drawings: Workspace members can view drawings for their workspace projects
CREATE POLICY "Workspace members can view drawings"
ON public.drawings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = drawings.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawings: Workspace members can create drawings for their workspace projects
CREATE POLICY "Workspace members can create drawings"
ON public.drawings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = drawings.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawings: Workspace members can update drawings for their workspace projects
CREATE POLICY "Workspace members can update drawings"
ON public.drawings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = drawings.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawing Pages: Workspace members can view pages for their workspace drawings
CREATE POLICY "Workspace members can view drawing pages"
ON public.drawing_pages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drawings d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = drawing_pages.drawing_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawing Pages: Workspace members can create pages for their workspace drawings
CREATE POLICY "Workspace members can create drawing pages"
ON public.drawing_pages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drawings d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = drawing_pages.drawing_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawing Pages: Workspace members can update pages for their workspace drawings
CREATE POLICY "Workspace members can update drawing pages"
ON public.drawing_pages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM drawings d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = drawing_pages.drawing_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawing Scales: Workspace members can view scales for their workspace drawing pages
CREATE POLICY "Workspace members can view drawing scales"
ON public.drawing_scales FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drawing_pages dp
    JOIN drawings d ON d.id = dp.drawing_id
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE dp.id = drawing_scales.drawing_page_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawing Scales: Workspace members can create scales for their workspace drawing pages
CREATE POLICY "Workspace members can create drawing scales"
ON public.drawing_scales FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drawing_pages dp
    JOIN drawings d ON d.id = dp.drawing_id
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE dp.id = drawing_scales.drawing_page_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawing Scales: Workspace members can update scales for their workspace drawing pages
CREATE POLICY "Workspace members can update drawing scales"
ON public.drawing_scales FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM drawing_pages dp
    JOIN drawings d ON d.id = dp.drawing_id
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE dp.id = drawing_scales.drawing_page_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);