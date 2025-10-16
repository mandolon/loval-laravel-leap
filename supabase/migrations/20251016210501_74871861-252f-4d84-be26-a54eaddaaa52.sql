-- =====================================================
-- PHASE 1: MVP Schema Migration (11 Core Tables) - FIXED
-- Modified version with custom system folders, file sharing, denormalized counters, and notes
-- =====================================================

-- Step 1: Short ID Generation Function
CREATE OR REPLACE FUNCTION generate_short_id(prefix text)
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := prefix || '-';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Step 2: Create Users Table (replaces profiles)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('U'),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  avatar_url text,
  last_active_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT users_short_id_format CHECK (short_id ~ '^U-[a-z0-9]{4}$')
);

-- Add foreign key for deleted_by after table exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_deleted_by_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id);
  END IF;
END $$;

-- Step 3: Update Workspaces Table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'short_id') THEN
    ALTER TABLE workspaces ADD COLUMN short_id text UNIQUE DEFAULT generate_short_id('W');
  END IF;
END $$;

-- Step 4: Update Workspace Members Table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'short_id') THEN
    ALTER TABLE workspace_members ADD COLUMN short_id text UNIQUE DEFAULT generate_short_id('WM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'deleted_at') THEN
    ALTER TABLE workspace_members ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'deleted_by') THEN
    ALTER TABLE workspace_members ADD COLUMN deleted_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Step 5: Create New Projects Table with Embedded Clients + Denormalized Counters
CREATE TABLE IF NOT EXISTS projects_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('P'),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  phase text NOT NULL DEFAULT 'Pre-Design',
  address jsonb DEFAULT '{}'::jsonb,
  primary_client_first_name text,
  primary_client_last_name text,
  primary_client_email text,
  primary_client_phone text,
  primary_client_address jsonb,
  secondary_client_first_name text,
  secondary_client_last_name text,
  secondary_client_email text,
  secondary_client_phone text,
  secondary_client_address jsonb,
  estimated_amount numeric(12,2),
  due_date date,
  progress int DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_tasks int DEFAULT 0,
  completed_tasks int DEFAULT 0,
  team_member_count int DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT projects_new_short_id_format CHECK (short_id ~ '^P-[a-z0-9]{4}$'),
  CONSTRAINT projects_new_status_check CHECK (status IN ('active', 'pending', 'completed', 'archived')),
  CONSTRAINT projects_new_phase_check CHECK (phase IN ('Pre-Design', 'Design', 'Permit', 'Build'))
);

-- Step 6: Create Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('PM'),
  project_id uuid NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  UNIQUE (project_id, user_id),
  CONSTRAINT project_members_short_id_format CHECK (short_id ~ '^PM-[a-z0-9]{4}$')
);

-- Step 7: Create New Tasks Table
CREATE TABLE IF NOT EXISTS tasks_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('T'),
  project_id uuid NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'task_redline',
  priority text NOT NULL DEFAULT 'medium',
  assignees uuid[] DEFAULT '{}',
  attached_files uuid[] DEFAULT '{}',
  due_date date,
  estimated_time int,
  actual_time numeric(10,2),
  sort_order int DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT tasks_new_short_id_format CHECK (short_id ~ '^T-[a-z0-9]{4}$'),
  CONSTRAINT tasks_new_status_check CHECK (status IN ('task_redline', 'progress_update', 'done_completed')),
  CONSTRAINT tasks_new_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Step 8: Create Folders Table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('FD'),
  project_id uuid NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
  parent_folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_system_folder boolean DEFAULT false,
  path text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT folders_short_id_format CHECK (short_id ~ '^FD-[a-z0-9]{4}$'),
  CONSTRAINT folders_system_protection CHECK ((is_system_folder = false) OR (deleted_at IS NULL))
);

-- Step 9: Create Files Table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('F'),
  project_id uuid NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks_new(id) ON DELETE SET NULL,
  parent_file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  filename text NOT NULL,
  version_number int DEFAULT 1,
  filesize bigint,
  mimetype text,
  storage_path text NOT NULL,
  download_count int DEFAULT 0,
  share_token text UNIQUE,
  is_shareable boolean DEFAULT false,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT files_short_id_format CHECK (short_id ~ '^F-[a-z0-9]{4}$')
);

-- Step 10: Create Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('N'),
  project_id uuid NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT notes_short_id_format CHECK (short_id ~ '^N-[a-z0-9]{4}$')
);

-- Step 11: Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('INV'),
  invoice_number text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
  submitted_to_names text[] DEFAULT '{}',
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  payment_method text,
  payment_reference text,
  paid_amount numeric(12,2),
  subtotal numeric(12,2) NOT NULL,
  processing_fee_percent numeric(5,2) DEFAULT 3.5,
  processing_fee_amount numeric(12,2),
  total numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT invoices_short_id_format CHECK (short_id ~ '^INV-[a-z0-9]{4}$'),
  CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT invoices_total_check CHECK (total = subtotal + COALESCE(processing_fee_amount, 0))
);

-- Step 12: Create Invoice Line Items Table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('ILI'),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  phase text,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT invoice_line_items_short_id_format CHECK (short_id ~ '^ILI-[a-z0-9]{4}$'),
  CONSTRAINT invoice_line_items_phase_check CHECK (phase IS NULL OR phase IN ('Pre-Design', 'Design', 'Permit', 'Build'))
);

-- Step 13: Data Migration from Old Schema
INSERT INTO users (id, auth_id, name, email, created_at, updated_at)
SELECT 
  id,
  id as auth_id,
  COALESCE(first_name || ' ' || last_name, email) as name,
  email,
  created_at,
  updated_at
FROM profiles
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects_new (
  id, workspace_id, name, description, status, phase, address,
  primary_client_first_name, primary_client_last_name, primary_client_email, primary_client_phone,
  estimated_amount, due_date, progress, created_by, created_at, updated_at
)
SELECT 
  p.id,
  p.workspace_id,
  p.name,
  p.description,
  CASE p.status WHEN 'on_hold' THEN 'archived' ELSE p.status END,
  CASE 
    WHEN p.phase = 'design' THEN 'Design'
    WHEN p.phase = 'permit' THEN 'Permit'
    WHEN p.phase = 'build' THEN 'Build'
    ELSE 'Pre-Design'
  END,
  COALESCE(p.address, '{}'::jsonb),
  SPLIT_PART(c.name, ' ', 1),
  SPLIT_PART(c.name, ' ', 2),
  c.email,
  c.phone,
  p.budget,
  p.due_date,
  p.progress,
  (SELECT id FROM users LIMIT 1),
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks_new (
  id, project_id, title, description, status, priority, assignees,
  due_date, estimated_time, actual_time, created_by, created_at, updated_at
)
SELECT 
  id,
  project_id,
  title,
  description,
  CASE status 
    WHEN 'complete' THEN 'done_completed'
    WHEN 'in_progress' THEN 'progress_update'
    ELSE 'task_redline'
  END,
  priority,
  assignees,
  due_date,
  estimated_time,
  actual_time::numeric,
  (SELECT id FROM users LIMIT 1),
  created_at,
  updated_at
FROM tasks
ON CONFLICT (id) DO NOTHING;

-- Step 14: Create Triggers
CREATE OR REPLACE FUNCTION auto_create_project_folders()
RETURNS TRIGGER AS $$
DECLARE
  folder_names text[] := ARRAY['Pre-Design', 'Design', 'Permit', 'Build', 'Plans', 'Photos', 'Attachments'];
  folder_name text;
BEGIN
  FOREACH folder_name IN ARRAY folder_names
  LOOP
    INSERT INTO folders (project_id, name, is_system_folder, created_by)
    VALUES (NEW.id, folder_name, true, NEW.created_by);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_project_folders ON projects_new;
CREATE TRIGGER trigger_auto_create_project_folders
AFTER INSERT ON projects_new
FOR EACH ROW
EXECUTE FUNCTION auto_create_project_folders();

CREATE OR REPLACE FUNCTION generate_file_share_token()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION auto_generate_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_shareable = true AND NEW.share_token IS NULL THEN
    NEW.share_token := generate_file_share_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_share_token ON files;
CREATE TRIGGER trigger_auto_generate_share_token
BEFORE INSERT OR UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION auto_generate_share_token();

DROP TRIGGER IF EXISTS trigger_update_projects_updated_at ON projects_new;
CREATE TRIGGER trigger_update_projects_updated_at BEFORE UPDATE ON projects_new FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tasks_updated_at ON tasks_new;
CREATE TRIGGER trigger_update_tasks_updated_at BEFORE UPDATE ON tasks_new FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_folders_updated_at ON folders;
CREATE TRIGGER trigger_update_folders_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_files_updated_at ON files;
CREATE TRIGGER trigger_update_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_notes_updated_at ON notes;
CREATE TRIGGER trigger_update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_project_task_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE projects_new 
    SET total_tasks = total_tasks + 1,
        completed_tasks = CASE WHEN NEW.status = 'done_completed' THEN completed_tasks + 1 ELSE completed_tasks END
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE projects_new 
      SET total_tasks = total_tasks - 1,
          completed_tasks = CASE WHEN OLD.status = 'done_completed' THEN completed_tasks - 1 ELSE completed_tasks END
      WHERE id = OLD.project_id;
    ELSIF OLD.status != NEW.status THEN
      UPDATE projects_new 
      SET completed_tasks = completed_tasks + 
          CASE 
            WHEN NEW.status = 'done_completed' AND OLD.status != 'done_completed' THEN 1
            WHEN OLD.status = 'done_completed' AND NEW.status != 'done_completed' THEN -1
            ELSE 0
          END
      WHERE id = NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_task_counters ON tasks_new;
CREATE TRIGGER trigger_update_project_task_counters
AFTER INSERT OR UPDATE ON tasks_new
FOR EACH ROW
EXECUTE FUNCTION update_project_task_counters();

CREATE OR REPLACE FUNCTION update_project_member_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE projects_new SET team_member_count = team_member_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE projects_new SET team_member_count = team_member_count - 1 WHERE id = OLD.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_member_counter ON project_members;
CREATE TRIGGER trigger_update_project_member_counter
AFTER INSERT OR UPDATE ON project_members
FOR EACH ROW
EXECUTE FUNCTION update_project_member_counter();

-- Step 15: Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_short_id ON users(short_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_short_id ON workspaces(short_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_short_id ON projects_new(short_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects_new(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects_new(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_phase ON projects_new(phase) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_short_id ON tasks_new(short_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks_new(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks_new(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks_new USING GIN(assignees);

CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_folder_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_share_token ON files(share_token) WHERE is_shareable = true;
CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_file_id);

CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- Step 16: Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Step 17: Create RLS Policies
CREATE POLICY "Users can view workspace members" ON users
FOR SELECT USING (
  id IN (
    SELECT user_id FROM workspace_members 
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view workspace projects" ON projects_new
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

CREATE POLICY "Users can create projects" ON projects_new
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update workspace projects" ON projects_new
FOR UPDATE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

CREATE POLICY "Users can view project tasks" ON tasks_new
FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects_new WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);

CREATE POLICY "Users can create tasks" ON tasks_new
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM projects_new WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);

CREATE POLICY "Users can update tasks" ON tasks_new
FOR UPDATE USING (
  project_id IN (
    SELECT id FROM projects_new WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);

CREATE POLICY "Users can view project files" ON files
FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects_new WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
  OR (is_shareable = true AND share_token IS NOT NULL)
);

CREATE POLICY "Users can create files" ON files
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM projects_new WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);

CREATE POLICY "Users can view project folders" ON folders FOR SELECT USING (project_id IN (SELECT id FROM projects_new WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)));
CREATE POLICY "Users can view project notes" ON notes FOR SELECT USING (project_id IN (SELECT id FROM projects_new WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)));
CREATE POLICY "Users can view project invoices" ON invoices FOR SELECT USING (project_id IN (SELECT id FROM projects_new WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)));

-- Step 18: Swap tables and cleanup
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

ALTER TABLE projects_new RENAME TO projects;
ALTER TABLE tasks_new RENAME TO tasks;