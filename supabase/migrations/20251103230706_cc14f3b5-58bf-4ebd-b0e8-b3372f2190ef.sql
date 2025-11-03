-- Create helper function to get public.users.id from auth.uid()
CREATE OR REPLACE FUNCTION public.get_public_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Workspace members can view drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can insert drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can update drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can delete drawing pages" ON drawing_pages;

-- Recreate policies with correct user ID
CREATE POLICY "Workspace members can view drawing pages"
ON drawing_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drawings
    WHERE drawings.id = drawing_pages.drawing_id
    AND is_workspace_member(get_public_user_id(), drawings.workspace_id)
  )
);

CREATE POLICY "Workspace members can insert drawing pages"
ON drawing_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drawings
    WHERE drawings.id = drawing_pages.drawing_id
    AND is_workspace_member(get_public_user_id(), drawings.workspace_id)
  )
);

CREATE POLICY "Workspace members can update drawing pages"
ON drawing_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM drawings
    WHERE drawings.id = drawing_pages.drawing_id
    AND is_workspace_member(get_public_user_id(), drawings.workspace_id)
  )
);

CREATE POLICY "Workspace members can delete drawing pages"
ON drawing_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM drawings
    WHERE drawings.id = drawing_pages.drawing_id
    AND is_workspace_member(get_public_user_id(), drawings.workspace_id)
  )
);