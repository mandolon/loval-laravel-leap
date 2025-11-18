-- Phase 1: Add AI Identity System columns

-- Add ai_instructions to workspace_settings
ALTER TABLE workspace_settings
ADD COLUMN ai_instructions TEXT;

-- Add project_type and ai_identity to projects
ALTER TABLE projects
ADD COLUMN project_type TEXT,
ADD COLUMN ai_identity JSONB;

-- Create indexes for better query performance
CREATE INDEX idx_projects_project_type ON projects(project_type) WHERE project_type IS NOT NULL;
CREATE INDEX idx_projects_ai_identity ON projects USING gin(ai_identity) WHERE ai_identity IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN workspace_settings.ai_instructions IS 'Custom AI assistant instructions for the workspace';
COMMENT ON COLUMN projects.project_type IS 'Type of architectural project (e.g., Addition, Remodel, ADU, New Construction)';
COMMENT ON COLUMN projects.ai_identity IS 'Detailed project metadata for AI context (JSONB format)';