-- Create storage policies for task-files bucket

-- Policy to allow authenticated workspace members to upload files
CREATE POLICY "Authenticated users can upload to task-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-files' AND
  auth.role() = 'authenticated'
);

-- Policy to allow authenticated workspace members to view files
CREATE POLICY "Authenticated users can view task-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-files' AND
  auth.role() = 'authenticated'
);

-- Policy to allow users to update their own uploaded files
CREATE POLICY "Users can update their own task-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-files' AND
  owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'task-files' AND
  owner = auth.uid()
);

-- Policy to allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own task-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-files' AND
  owner = auth.uid()
);