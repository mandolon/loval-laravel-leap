-- Add metadata column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_projects_metadata ON projects USING gin(metadata);

-- Add documentation comment
COMMENT ON COLUMN projects.metadata IS 'JSONB field for storing project-level metadata like focus list todos, custom settings, etc.';