-- Create policies for drawing-images bucket access
-- Note: RLS is already enabled on storage.objects by Supabase

-- Policy: Allow authenticated users to upload images to their project's drawing-images
CREATE POLICY "Users can upload drawing images to their projects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'drawing-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE id = (storage.foldername(name))[1]::uuid
  )
);

-- Policy: Allow authenticated users to view drawing images from workspace projects
CREATE POLICY "Users can view drawing images from workspace projects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'drawing-images' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text 
    FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid() AND wm.deleted_at IS NULL
  )
);

-- Policy: Allow authenticated users to delete their project's drawing images
CREATE POLICY "Users can delete drawing images from their projects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'drawing-images' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text 
    FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid() AND wm.deleted_at IS NULL
  )
);