-- Migration: AI Identity System for Workspace and Project Context
-- Add AI configuration fields to workspace_settings and projects tables

-- Add AI instructions to workspace_settings
-- Nullable by default, UI will provide residential architecture preset
ALTER TABLE workspace_settings 
ADD COLUMN IF NOT EXISTS ai_instructions TEXT DEFAULT NULL;

COMMENT ON COLUMN workspace_settings.ai_instructions IS 'Custom AI assistant instructions defining workspace industry focus, workflow, and terminology';

-- Add project type and AI identity to projects
-- project_type: simple string like 'adu', 'remodel', 'addition', 'new_construction'
-- ai_identity: JSONB containing structured project context (zoning, requirements, next steps)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_type TEXT,
ADD COLUMN IF NOT EXISTS ai_identity JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN projects.project_type IS 'Project category: adu, remodel, addition, new_construction, historic';
COMMENT ON COLUMN projects.ai_identity IS 'Structured project AI context (zoning, setbacks, compliance, consultants, next steps)';

-- Create index on project_type for filtering
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type) WHERE project_type IS NOT NULL;

-- Create GIN index on ai_identity JSONB for efficient querying
CREATE INDEX IF NOT EXISTS idx_projects_ai_identity ON projects USING GIN (ai_identity);
