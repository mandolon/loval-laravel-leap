-- Add metadata field to projects table for storing project-level data like focus list todos
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_projects_metadata ON projects USING gin(metadata);

-- Add comment
COMMENT ON COLUMN projects.metadata IS 'JSONB field for storing project-level metadata like focus list todos, custom settings, etc.';
