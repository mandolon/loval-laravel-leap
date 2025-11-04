-- Disable RLS on workspace_files table
ALTER TABLE workspace_files DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on workspace_files
DROP POLICY IF EXISTS "workspace_files_select_policy" ON workspace_files;
DROP POLICY IF EXISTS "workspace_files_insert_policy" ON workspace_files;
DROP POLICY IF EXISTS "workspace_files_update_policy" ON workspace_files;
DROP POLICY IF EXISTS "workspace_files_delete_policy" ON workspace_files;

-- Disable RLS on files table
ALTER TABLE files DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on files
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;
DROP POLICY IF EXISTS "files_delete_policy" ON files;

-- Make storage buckets public (disable RLS on storage)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'workspace-files';

UPDATE storage.buckets 
SET public = true 
WHERE id = 'project-files';

-- Drop any existing storage policies
DROP POLICY IF EXISTS "workspace_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "workspace_files_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "workspace_files_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "workspace_files_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "project_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "project_files_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "project_files_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "project_files_storage_delete" ON storage.objects;