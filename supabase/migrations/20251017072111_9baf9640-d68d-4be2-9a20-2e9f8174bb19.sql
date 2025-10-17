-- Create new project-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false);

-- Copy all files from task-files to project-files bucket
-- Note: This updates the bucket_id in storage.objects
UPDATE storage.objects
SET bucket_id = 'project-files'
WHERE bucket_id = 'task-files';

-- Drop old policies for task-files
DROP POLICY IF EXISTS "Authenticated users can upload to task-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view task-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own task-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task-files" ON storage.objects;

-- Create new policies for project-files bucket
CREATE POLICY "Authenticated users can upload to project-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view project-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own project-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'project-files' AND
  owner = auth.uid()
);

CREATE POLICY "Users can delete their own project-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  owner = auth.uid()
);

-- Delete old task-files bucket
DELETE FROM storage.buckets WHERE id = 'task-files';