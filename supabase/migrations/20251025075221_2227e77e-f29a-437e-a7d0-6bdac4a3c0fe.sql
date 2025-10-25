-- Create storage bucket for detail library
INSERT INTO storage.buckets (id, name, public)
VALUES ('detail-library', 'detail-library', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for detail-library bucket
CREATE POLICY "Users can view detail library files in their workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'detail-library' AND
  (storage.foldername(name))[1] IN (
    SELECT w.id::text
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

CREATE POLICY "Users can upload detail library files to their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'detail-library' AND
  (storage.foldername(name))[1] IN (
    SELECT w.id::text
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

CREATE POLICY "Users can update detail library files in their workspace"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'detail-library' AND
  (storage.foldername(name))[1] IN (
    SELECT w.id::text
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

CREATE POLICY "Users can delete detail library files in their workspace"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'detail-library' AND
  (storage.foldername(name))[1] IN (
    SELECT w.id::text
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);