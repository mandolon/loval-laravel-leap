-- Step 1: Storage Policies for project-files bucket

-- Policy 1: Users can read project files
CREATE POLICY "Users can read project files"
ON storage.objects FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'project-files'
);

-- Policy 2: Users can upload project files
CREATE POLICY "Users can upload project files"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'project-files'
);

-- Policy 3: Users can update project files
CREATE POLICY "Users can update project files"
ON storage.objects FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'project-files'
);