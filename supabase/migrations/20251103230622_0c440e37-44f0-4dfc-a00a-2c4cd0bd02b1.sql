-- Enable RLS on drawing_pages table
ALTER TABLE drawing_pages ENABLE ROW LEVEL SECURITY;

-- Policy: Workspace members can view all drawing pages (including deleted ones for trash view)
CREATE POLICY "Workspace members can view drawing pages"
ON drawing_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drawings
    WHERE drawings.id = drawing_pages.drawing_id
    AND is_workspace_member(auth.uid(), drawings.workspace_id)
  )
);

-- Policy: Workspace members can insert drawing pages
CREATE POLICY "Workspace members can insert drawing pages"
ON drawing_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drawings
    WHERE drawings.id = drawing_pages.drawing_id
    AND is_workspace_member(auth.uid(), drawings.workspace_id)
  )
);

-- Policy: Workspace members can update drawing pages
CREATE POLICY "Workspace members can update drawing pages"
ON drawing_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM drawings
    WHERE drawings.id = drawing_pages.drawing_id
    AND is_workspace_member(auth.uid(), drawings.workspace_id)
  )
);

-- Policy: Workspace members can delete drawing pages
CREATE POLICY "Workspace members can delete drawing pages"
ON drawing_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM drawings
    WHERE drawings.id = drawing_pages.drawing_id
    AND is_workspace_member(auth.uid(), drawings.workspace_id)
  )
);