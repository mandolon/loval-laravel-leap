-- SQL Script to delete all uncategorized files from detail library
-- Run this in Supabase SQL Editor

-- First, see what will be deleted
SELECT id, title, storage_path, created_at
FROM detail_library_files
WHERE subfolder_id IS NULL
  AND deleted_at IS NULL;

-- Then run this to delete from storage (if needed, you may need to do this manually)
-- Note: Storage deletion should be done via Supabase Storage UI or API

-- Finally, delete from database
DELETE FROM detail_library_files
WHERE subfolder_id IS NULL
  AND deleted_at IS NULL;

