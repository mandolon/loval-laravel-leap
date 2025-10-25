-- Drop existing workspace-specific RLS policies FIRST
DROP POLICY IF EXISTS "Users can view categories for their workspaces" ON detail_library_categories;
DROP POLICY IF EXISTS "Users can insert categories for their workspaces" ON detail_library_categories;
DROP POLICY IF EXISTS "Users can view subfolders for their workspaces" ON detail_library_subfolders;
DROP POLICY IF EXISTS "Users can insert subfolders for their workspaces" ON detail_library_subfolders;
DROP POLICY IF EXISTS "Users can update subfolders for their workspaces" ON detail_library_subfolders;
DROP POLICY IF EXISTS "Users can delete subfolders for their workspaces" ON detail_library_subfolders;
DROP POLICY IF EXISTS "Users can view non-deleted files for their workspaces" ON detail_library_files;
DROP POLICY IF EXISTS "Users can insert files for their workspaces" ON detail_library_files;
DROP POLICY IF EXISTS "Users can update files for their workspaces" ON detail_library_files;
DROP POLICY IF EXISTS "Users can view items for accessible files" ON detail_library_items;
DROP POLICY IF EXISTS "Users can insert items for accessible files" ON detail_library_items;
DROP POLICY IF EXISTS "Users can delete items for accessible files" ON detail_library_items;

-- Remove workspace_id columns
ALTER TABLE detail_library_categories DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE detail_library_subfolders DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE detail_library_files DROP COLUMN IF EXISTS workspace_id;

-- Create universal access policies
CREATE POLICY "Authenticated users can access all categories"
ON detail_library_categories FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can access all subfolders"
ON detail_library_subfolders FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can access all files"
ON detail_library_files FOR ALL
TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (true);

CREATE POLICY "Authenticated users can access all items"
ON detail_library_items FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Clean up duplicate categories (keep only one of each slug)
DELETE FROM detail_library_categories a USING detail_library_categories b
WHERE a.id > b.id AND a.slug = b.slug;

-- Add unique constraint on slug
ALTER TABLE detail_library_categories ADD CONSTRAINT detail_library_categories_slug_key UNIQUE (slug);

-- Ensure system categories exist (will fail silently if they exist due to unique constraint)
INSERT INTO detail_library_categories (name, slug, sort_order, is_system_category, short_id)
VALUES
  ('Foundation', 'foundation', 1, true, ''),
  ('Wall', 'wall', 2, true, ''),
  ('Floor/Ceiling', 'floor-ceiling', 3, true, ''),
  ('Roof', 'roof', 4, true, ''),
  ('Stair', 'stair', 5, true, ''),
  ('Finish', 'finish', 6, true, '')
ON CONFLICT (slug) DO NOTHING;