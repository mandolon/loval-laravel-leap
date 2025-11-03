-- Drop all RLS policies on drawing_pages
DROP POLICY IF EXISTS "Workspace members can view drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can insert drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can update drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can delete drawing pages" ON drawing_pages;

-- Disable RLS on drawing_pages
ALTER TABLE drawing_pages DISABLE ROW LEVEL SECURITY;

-- Drop the helper function
DROP FUNCTION IF EXISTS public.get_public_user_id();