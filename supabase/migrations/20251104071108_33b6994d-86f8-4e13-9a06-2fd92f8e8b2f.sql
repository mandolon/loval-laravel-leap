-- Storage policies for workspace-files bucket
CREATE POLICY "Authenticated users can upload to workspace-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-files' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can read workspace-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workspace-files' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update workspace-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-files' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'workspace-files' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete workspace-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-files' 
  AND auth.role() = 'authenticated'
);