-- Create 4 tables for 3D model viewer persistence
-- NO RLS per project architecture policy

-- Table 1: model_dimensions
CREATE TABLE model_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  dimension_data JSONB NOT NULL,
  label TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_dimensions_version ON model_dimensions(version_id);
CREATE INDEX idx_model_dimensions_created_by ON model_dimensions(created_by);

-- Table 2: model_annotations
CREATE TABLE model_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  position JSONB NOT NULL,
  text TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_annotations_version ON model_annotations(version_id);
CREATE INDEX idx_model_annotations_created_by ON model_annotations(created_by);

-- Table 3: model_clipping_planes
CREATE TABLE model_clipping_planes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  plane_data JSONB NOT NULL,
  name TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_clipping_planes_version ON model_clipping_planes(version_id);
CREATE INDEX idx_model_clipping_planes_created_by ON model_clipping_planes(created_by);

-- Table 4: model_camera_views
CREATE TABLE model_camera_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position JSONB NOT NULL,
  target JSONB NOT NULL,
  zoom FLOAT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_camera_views_version ON model_camera_views(version_id);
CREATE INDEX idx_model_camera_views_created_by ON model_camera_views(created_by);