-- Drop all RLS policies for drawings
DROP POLICY IF EXISTS "Workspace members can view drawings" ON drawings;
DROP POLICY IF EXISTS "Workspace members can create drawings" ON drawings;
DROP POLICY IF EXISTS "Workspace members can update drawings" ON drawings;
DROP POLICY IF EXISTS "Workspace members can delete drawings" ON drawings;

-- Drop all RLS policies for drawing_pages
DROP POLICY IF EXISTS "Users can view drawing pages from their workspace" ON drawing_pages;
DROP POLICY IF EXISTS "Users can create drawing pages in their workspace" ON drawing_pages;
DROP POLICY IF EXISTS "Users can update drawing pages in their workspace" ON drawing_pages;
DROP POLICY IF EXISTS "Users can delete drawing pages in their workspace" ON drawing_pages;

-- Drop all RLS policies for drawing_scales
DROP POLICY IF EXISTS "Users can view scales from their workspace drawings" ON drawing_scales;
DROP POLICY IF EXISTS "Users can create scales in their workspace drawings" ON drawing_scales;
DROP POLICY IF EXISTS "Users can update scales in their workspace drawings" ON drawing_scales;
DROP POLICY IF EXISTS "Users can delete scales in their workspace drawings" ON drawing_scales;

-- Disable RLS on all drawing tables
ALTER TABLE drawings DISABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_scales DISABLE ROW LEVEL SECURITY;