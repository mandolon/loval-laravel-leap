-- Create workspace_files table (workspace-specific files, NO RLS)
CREATE TABLE IF NOT EXISTS public.workspace_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id uuid NULL,
  parent_file_id uuid NULL,
  version_number integer DEFAULT 1,
  filesize bigint,
  download_count integer DEFAULT 0,
  is_shareable boolean DEFAULT false,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz NULL,
  deleted_by uuid NULL,
  short_id text NOT NULL DEFAULT generate_short_id('WF'::text),
  filename text NOT NULL,
  mimetype text,
  storage_path text NOT NULL,
  share_token text
);

-- Create workspace_folders table (NO RLS)
CREATE TABLE IF NOT EXISTS public.workspace_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_folder_id uuid NULL REFERENCES workspace_folders(id),
  is_system_folder boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz NULL,
  deleted_by uuid NULL,
  short_id text NOT NULL DEFAULT generate_short_id('WFD'::text),
  name text NOT NULL,
  path text
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_files_workspace_id ON workspace_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_folder_id ON workspace_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_uploaded_by ON workspace_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_workspace_files_deleted_at ON workspace_files(deleted_at);
CREATE INDEX IF NOT EXISTS idx_workspace_folders_workspace_id ON workspace_folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_folders_parent_folder_id ON workspace_folders(parent_folder_id);

-- Add triggers for updated_at
CREATE TRIGGER workspace_files_updated_at
  BEFORE UPDATE ON workspace_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER workspace_folders_updated_at
  BEFORE UPDATE ON workspace_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for workspace files (NO RLS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', false)
ON CONFLICT (id) DO NOTHING;