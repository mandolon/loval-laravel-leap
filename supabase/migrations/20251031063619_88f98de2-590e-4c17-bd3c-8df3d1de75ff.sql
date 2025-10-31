-- Enable RLS on drawing-related tables
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_scales ENABLE ROW LEVEL SECURITY;

-- Drawings policies: Workspace members can access drawings for their workspace projects
CREATE POLICY "Workspace members can view drawings"
ON drawings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = drawings.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Workspace members can create drawings"
ON drawings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = drawings.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Workspace members can update drawings"
ON drawings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = drawings.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

CREATE POLICY "Workspace members can delete drawings"
ON drawings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = drawings.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Drawing Pages policies: Access based on parent drawing
CREATE POLICY "Users can view drawing pages from their workspace"
ON drawing_pages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM drawings d
    INNER JOIN projects p ON p.id = d.project_id
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE d.id = drawing_pages.drawing_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND d.deleted_at IS NULL
  )
);

CREATE POLICY "Users can create drawing pages in their workspace"
ON drawing_pages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drawings d
    INNER JOIN projects p ON p.id = d.project_id
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE d.id = drawing_pages.drawing_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND d.deleted_at IS NULL
  )
);

CREATE POLICY "Users can update drawing pages in their workspace"
ON drawing_pages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM drawings d
    INNER JOIN projects p ON p.id = d.project_id
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE d.id = drawing_pages.drawing_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND d.deleted_at IS NULL
  )
);

CREATE POLICY "Users can delete drawing pages in their workspace"
ON drawing_pages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM drawings d
    INNER JOIN projects p ON p.id = d.project_id
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE d.id = drawing_pages.drawing_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND d.deleted_at IS NULL
  )
);

-- Drawing Scales policies: Access based on parent drawing page
CREATE POLICY "Users can view scales from their workspace drawings"
ON drawing_scales
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM drawing_pages dp
    INNER JOIN drawings d ON d.id = dp.drawing_id
    INNER JOIN projects p ON p.id = d.project_id
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE dp.id = drawing_scales.drawing_page_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND d.deleted_at IS NULL
  )
);

CREATE POLICY "Users can create scales in their workspace drawings"
ON drawing_scales
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drawing_pages dp
    INNER JOIN drawings d ON d.id = dp.drawing_id
    INNER JOIN projects p ON p.id = d.project_id
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE dp.id = drawing_scales.drawing_page_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND d.deleted_at IS NULL
  )
);

CREATE POLICY "Users can update scales in their workspace drawings"
ON drawing_scales
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM drawing_pages dp
    INNER JOIN drawings d ON d.id = dp.drawing_id
    INNER JOIN projects p ON p.id = d.project_id
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE dp.id = drawing_scales.drawing_page_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND d.deleted_at IS NULL
  )
);

CREATE POLICY "Users can delete scales in their workspace drawings"
ON drawing_scales
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM drawing_pages dp
    INNER JOIN drawings d ON d.id = dp.drawing_id
    INNER JOIN projects p ON p.id = d.project_id
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE dp.id = drawing_scales.drawing_page_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND d.deleted_at IS NULL
  )
);