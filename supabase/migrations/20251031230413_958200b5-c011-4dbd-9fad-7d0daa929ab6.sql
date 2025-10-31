-- Add performance indexes to fix drawing query timeouts

-- Index for drawing_pages.drawing_id lookup (foreign key)
CREATE INDEX IF NOT EXISTS idx_drawing_pages_drawing_id 
ON drawing_pages(drawing_id);

-- Index for drawing_scales.drawing_page_id lookup (foreign key)
CREATE INDEX IF NOT EXISTS idx_drawing_scales_drawing_page_id 
ON drawing_scales(drawing_page_id);

-- Composite index for drawings project_id + deleted_at filter
CREATE INDEX IF NOT EXISTS idx_drawings_project_id_active 
ON drawings(project_id, deleted_at) 
WHERE deleted_at IS NULL;