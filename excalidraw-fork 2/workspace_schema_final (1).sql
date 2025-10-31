-- =====================================================
-- WORKSPACE-SCOPED DATABASE SCHEMA
-- Production-ready MVP for internal desktop app
-- Global fixed roles via user_roles table
-- =====================================================

-- WORKSPACES TABLE
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT workspaces_short_id_format CHECK (short_id ~ '^W-[a-z0-9]{4}$')
);

-- USERS TABLE
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  auth_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  last_active_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT users_short_id_format CHECK (short_id ~ '^U-[a-z0-9]{4}$')
);

-- USER ROLES TABLE (Global role per user)
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_roles_role_check CHECK (role IN ('team', 'consultant', 'client'))
);

-- USER PREFERENCES TABLE
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  notifications_enabled boolean DEFAULT true,
  email_digest boolean DEFAULT false,
  sidebar_collapsed boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WORKSPACE SETTINGS TABLE
CREATE TABLE workspace_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  default_invoice_terms int DEFAULT 30,
  company_name text,
  company_logo_url text,
  tax_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WORKSPACE MEMBERS TABLE (Membership only - no roles)
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT workspace_members_short_id_format CHECK (short_id ~ '^WM-[a-z0-9]{4}$'),
  UNIQUE (workspace_id, user_id)
);

-- PROJECTS TABLE
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  phase text NOT NULL DEFAULT 'Pre-Design',
  address jsonb NOT NULL,
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
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT projects_short_id_format CHECK (short_id ~ '^P-[a-z0-9]{4}$'),
  CONSTRAINT projects_status_check CHECK (status IN ('active', 'pending', 'completed', 'archived')),
  CONSTRAINT projects_phase_check CHECK (phase IN ('Pre-Design', 'Design', 'Permit', 'Build'))
);

-- PROJECT MEMBERS TABLE (Visibility/assignment only)
CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT project_members_short_id_format CHECK (short_id ~ '^PM-[a-z0-9]{4}$'),
  UNIQUE (project_id, user_id)
);

-- TASKS TABLE
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
  CONSTRAINT tasks_short_id_format CHECK (short_id ~ '^T-[a-z0-9]{4}$'),
  CONSTRAINT tasks_status_check CHECK (status IN ('task_redline', 'progress_update', 'done_completed')),
  CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- TIME ENTRIES TABLE
CREATE TABLE time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  duration_hours numeric(10,2) NOT NULL,
  description text,
  entry_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT time_entries_short_id_format CHECK (short_id ~ '^TE-[a-z0-9]{4}$'),
  CONSTRAINT time_entries_duration_positive CHECK (duration_hours > 0)
);

-- FOLDERS TABLE
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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

-- FILES TABLE
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  parent_file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  filename text NOT NULL,
  version_number int DEFAULT 1,
  filesize bigint,
  mimetype text,
  storage_path text NOT NULL,
  download_count int DEFAULT 0,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT files_short_id_format CHECK (short_id ~ '^F-[a-z0-9]{4}$')
);

-- NOTES TABLE
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT notes_short_id_format CHECK (short_id ~ '^N-[a-z0-9]{4}$')
);

-- PROJECT CHAT MESSAGES TABLE
CREATE TABLE project_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  content text NOT NULL,
  referenced_files uuid[] DEFAULT '{}',
  referenced_tasks uuid[] DEFAULT '{}',
  reply_to_message_id uuid REFERENCES project_chat_messages(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT project_chat_messages_short_id_format CHECK (short_id ~ '^PCM-[a-z0-9]{4}$')
);

-- AI CHAT THREADS TABLE
CREATE TABLE ai_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT ai_chat_threads_short_id_format CHECK (short_id ~ '^ACT-[a-z0-9]{4}$')
);

-- AI CHAT MESSAGES TABLE
CREATE TABLE ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  thread_id uuid NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
  message_type text NOT NULL,
  content text NOT NULL,
  model text,
  tokens_used int,
  referenced_projects uuid[] DEFAULT '{}',
  referenced_files uuid[] DEFAULT '{}',
  referenced_tasks uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT ai_chat_messages_short_id_format CHECK (short_id ~ '^ACM-[a-z0-9]{4}$'),
  CONSTRAINT ai_chat_messages_type_check CHECK (message_type IN ('user', 'assistant'))
);

-- ACTIVITY LOG TABLE
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_value text,
  new_value text,
  change_summary text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT activity_log_short_id_format CHECK (short_id ~ '^AL-[a-z0-9]{4}$')
);

-- INVOICES TABLE
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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

-- INVOICE LINE ITEMS TABLE
CREATE TABLE invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  phase text,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT invoice_line_items_short_id_format CHECK (short_id ~ '^ILI-[a-z0-9]{4}$'),
  CONSTRAINT invoice_line_items_phase_check CHECK (phase IN ('Pre-Design', 'Design', 'Permit', 'Build'))
);

-- LINKS TABLE
CREATE TABLE links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),
  CONSTRAINT links_short_id_format CHECK (short_id ~ '^L-[a-z0-9]{4}$')
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  content text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  action_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT notifications_short_id_format CHECK (short_id ~ '^N-[a-z0-9]{4}$')
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX workspaces_short_id_idx ON workspaces (short_id);

CREATE INDEX users_short_id_idx ON users (short_id);
CREATE INDEX users_auth_id_idx ON users (auth_id);
CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_is_admin_idx ON users (is_admin) WHERE is_admin = true;
CREATE INDEX users_active_idx ON users (id) WHERE deleted_at IS NULL;

CREATE INDEX user_roles_user_id_idx ON user_roles (user_id);
CREATE INDEX user_roles_role_idx ON user_roles (role);

CREATE INDEX user_preferences_user_idx ON user_preferences (user_id);

CREATE INDEX workspace_settings_workspace_idx ON workspace_settings (workspace_id);

CREATE INDEX workspace_members_short_id_idx ON workspace_members (short_id);
CREATE INDEX workspace_members_workspace_idx ON workspace_members (workspace_id);
CREATE INDEX workspace_members_user_idx ON workspace_members (user_id);
CREATE INDEX workspace_members_active_idx ON workspace_members (workspace_id, user_id) WHERE deleted_at IS NULL;

CREATE INDEX projects_workspace_idx ON projects (workspace_id);
CREATE INDEX projects_workspace_status_idx ON projects (workspace_id, status);
CREATE INDEX projects_short_id_idx ON projects (short_id);
CREATE INDEX projects_created_by_idx ON projects (created_by);
CREATE INDEX projects_active_idx ON projects (workspace_id) WHERE deleted_at IS NULL;

CREATE INDEX project_members_short_id_idx ON project_members (short_id);
CREATE INDEX project_members_project_idx ON project_members (project_id);
CREATE INDEX project_members_user_idx ON project_members (user_id);
CREATE INDEX project_members_active_idx ON project_members (project_id, user_id) WHERE deleted_at IS NULL;

CREATE INDEX tasks_project_idx ON tasks (project_id);
CREATE INDEX tasks_project_status_idx ON tasks (project_id, status);
CREATE INDEX tasks_short_id_idx ON tasks (short_id);
CREATE INDEX tasks_created_by_idx ON tasks (created_by);
CREATE INDEX tasks_updated_by_idx ON tasks (updated_by);
CREATE INDEX tasks_active_idx ON tasks (project_id) WHERE deleted_at IS NULL;

CREATE INDEX time_entries_short_id_idx ON time_entries (short_id);
CREATE INDEX time_entries_project_idx ON time_entries (project_id);
CREATE INDEX time_entries_task_idx ON time_entries (task_id);
CREATE INDEX time_entries_user_idx ON time_entries (user_id);
CREATE INDEX time_entries_date_idx ON time_entries (entry_date);
CREATE INDEX time_entries_active_idx ON time_entries (project_id) WHERE deleted_at IS NULL;

CREATE INDEX folders_short_id_idx ON folders (short_id);
CREATE INDEX folders_project_idx ON folders (project_id);
CREATE INDEX folders_parent_idx ON folders (parent_folder_id);
CREATE INDEX folders_system_idx ON folders (project_id, is_system_folder);
CREATE INDEX folders_created_by_idx ON folders (created_by);
CREATE INDEX folders_active_idx ON folders (project_id) WHERE deleted_at IS NULL;

CREATE INDEX files_short_id_idx ON files (short_id);
CREATE INDEX files_project_idx ON files (project_id);
CREATE INDEX files_folder_idx ON files (folder_id);
CREATE INDEX files_task_idx ON files (task_id);
CREATE INDEX files_parent_file_idx ON files (parent_file_id);
CREATE INDEX files_version_idx ON files (parent_file_id, version_number);
CREATE INDEX files_uploaded_by_idx ON files (uploaded_by);
CREATE INDEX files_active_idx ON files (project_id) WHERE deleted_at IS NULL;

CREATE INDEX notes_short_id_idx ON notes (short_id);
CREATE INDEX notes_project_idx ON notes (project_id);
CREATE INDEX notes_created_by_idx ON notes (created_by);
CREATE INDEX notes_updated_by_idx ON notes (updated_by);
CREATE INDEX notes_active_idx ON notes (project_id) WHERE deleted_at IS NULL;

CREATE INDEX project_chat_messages_short_id_idx ON project_chat_messages (short_id);
CREATE INDEX project_chat_messages_project_idx ON project_chat_messages (project_id);
CREATE INDEX project_chat_messages_user_idx ON project_chat_messages (user_id);
CREATE INDEX project_chat_messages_reply_idx ON project_chat_messages (reply_to_message_id);
CREATE INDEX project_chat_messages_active_idx ON project_chat_messages (project_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX ai_chat_threads_short_id_idx ON ai_chat_threads (short_id);
CREATE INDEX ai_chat_threads_workspace_idx ON ai_chat_threads (workspace_id);
CREATE INDEX ai_chat_threads_user_idx ON ai_chat_threads (user_id);
CREATE INDEX ai_chat_threads_active_idx ON ai_chat_threads (workspace_id, updated_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX ai_chat_messages_short_id_idx ON ai_chat_messages (short_id);
CREATE INDEX ai_chat_messages_thread_idx ON ai_chat_messages (thread_id, created_at ASC);
CREATE INDEX ai_chat_messages_active_idx ON ai_chat_messages (thread_id) WHERE deleted_at IS NULL;

CREATE INDEX activity_log_short_id_idx ON activity_log (short_id);
CREATE INDEX activity_log_workspace_idx ON activity_log (workspace_id, created_at DESC);
CREATE INDEX activity_log_project_idx ON activity_log (project_id, created_at DESC);
CREATE INDEX activity_log_user_idx ON activity_log (user_id, created_at DESC);
CREATE INDEX activity_log_resource_idx ON activity_log (resource_type, resource_id, created_at DESC);

CREATE INDEX invoices_short_id_idx ON invoices (short_id);
CREATE INDEX invoices_project_idx ON invoices (project_id);
CREATE INDEX invoices_invoice_number_idx ON invoices (invoice_number);
CREATE INDEX invoices_status_idx ON invoices (status);
CREATE INDEX invoices_due_date_idx ON invoices (due_date);
CREATE INDEX invoices_created_by_idx ON invoices (created_by);
CREATE INDEX invoices_updated_by_idx ON invoices (updated_by);
CREATE INDEX invoices_active_idx ON invoices (project_id, invoice_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX invoice_line_items_short_id_idx ON invoice_line_items (short_id);
CREATE INDEX invoice_line_items_invoice_idx ON invoice_line_items (invoice_id, sort_order);

CREATE INDEX links_short_id_idx ON links (short_id);
CREATE INDEX links_project_idx ON links (project_id);
CREATE INDEX links_created_by_idx ON links (created_by);
CREATE INDEX links_active_idx ON links (project_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX notifications_short_id_idx ON notifications (short_id);
CREATE INDEX notifications_user_idx ON notifications (user_id, is_read);
CREATE INDEX notifications_workspace_idx ON notifications (workspace_id, created_at DESC);
CREATE INDEX notifications_project_idx ON notifications (project_id, created_at DESC);