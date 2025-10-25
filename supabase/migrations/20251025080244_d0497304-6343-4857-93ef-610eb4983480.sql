-- Create detail_library_subfolders table
CREATE TABLE detail_library_subfolders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE NOT NULL DEFAULT generate_detail_library_short_id('DLS'),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES detail_library_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(category_id, name)
);

-- Add subfolder_id to detail_library_files
ALTER TABLE detail_library_files 
ADD COLUMN subfolder_id UUID REFERENCES detail_library_subfolders(id) ON DELETE SET NULL;

-- Create index for faster subfolder lookups
CREATE INDEX idx_detail_library_files_subfolder_id ON detail_library_files(subfolder_id);
CREATE INDEX idx_detail_library_subfolders_category_id ON detail_library_subfolders(category_id);

-- RLS policies for subfolders
ALTER TABLE detail_library_subfolders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subfolders for their workspaces"
  ON detail_library_subfolders FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert subfolders for their workspaces"
  ON detail_library_subfolders FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update subfolders for their workspaces"
  ON detail_library_subfolders FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete subfolders for their workspaces"
  ON detail_library_subfolders FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Trigger for auto-generating short_id
CREATE TRIGGER set_detail_library_subfolder_short_id
  BEFORE INSERT ON detail_library_subfolders
  FOR EACH ROW
  EXECUTE FUNCTION set_detail_library_item_short_id();

-- Trigger for updated_at
CREATE TRIGGER update_detail_library_subfolders_updated_at
  BEFORE UPDATE ON detail_library_subfolders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();