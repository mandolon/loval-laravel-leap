-- Create file_annotations table (NO RLS POLICIES - UI-based access only)
CREATE TABLE IF NOT EXISTS file_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INT DEFAULT 1,
  annotation_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, version_number),
  CONSTRAINT annotations_version_positive CHECK (version_number > 0)
);

CREATE INDEX idx_file_annotations_file_id ON file_annotations(file_id);
CREATE INDEX idx_file_annotations_project_id ON file_annotations(project_id);
CREATE INDEX idx_file_annotations_version ON file_annotations(file_id, version_number DESC);

COMMENT ON TABLE file_annotations IS 'Stores PDF annotations - NO RLS policies, all authenticated users have access';
COMMENT ON COLUMN file_annotations.annotation_data IS 'JSON storage for Fabric.js canvas data with PDF coordinates';