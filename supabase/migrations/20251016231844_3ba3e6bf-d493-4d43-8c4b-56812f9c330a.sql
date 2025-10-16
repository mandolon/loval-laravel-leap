-- Phase 9: Add Missing Schema Constraints & Defaults
-- Adds CHECK constraints and defaults from clean schema v1.11

-- =====================================================
-- PART 1: ADD CHECK CONSTRAINTS
-- =====================================================

-- Projects table constraints
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('active', 'pending', 'completed', 'archived'));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_phase_check;
ALTER TABLE projects ADD CONSTRAINT projects_phase_check 
  CHECK (phase IN ('Pre-Design', 'Design', 'Permit', 'Build'));

-- Tasks table constraints
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('task_redline', 'progress_update', 'done_completed'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Invoices table constraints
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_total_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_total_check 
  CHECK (total = subtotal + COALESCE(processing_fee_amount, 0));

-- Invoice line items constraint
ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_phase_check;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_phase_check 
  CHECK (phase IN ('Pre-Design', 'Design', 'Permit', 'Build'));

-- Workspace members constraint (excluding 'admin' per global admin design)
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
  CHECK (role IN ('team', 'consultant', 'client'));

-- AI chat messages constraint
ALTER TABLE ai_chat_messages DROP CONSTRAINT IF EXISTS ai_chat_messages_type_check;
ALTER TABLE ai_chat_messages ADD CONSTRAINT ai_chat_messages_type_check 
  CHECK (message_type IN ('user', 'assistant'));

-- Time entries constraint
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_duration_positive;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_duration_positive 
  CHECK (duration_hours > 0);

-- Folders constraint (system folders can't be soft-deleted)
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_system_protection;
ALTER TABLE folders ADD CONSTRAINT folders_system_protection 
  CHECK ((is_system_folder = false) OR (deleted_at IS NULL));

-- =====================================================
-- PART 2: ADD MISSING DEFAULT VALUES
-- =====================================================

-- Ensure all short_id columns have defaults
ALTER TABLE users 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('U');

ALTER TABLE workspaces 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('W');

ALTER TABLE projects 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('P');

ALTER TABLE tasks 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('T');

ALTER TABLE workspace_members 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('WM');

ALTER TABLE project_members 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('PM');

ALTER TABLE folders 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('FD');

ALTER TABLE files 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('F');

ALTER TABLE notes 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('N');

ALTER TABLE project_chat_messages 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('PCM');

ALTER TABLE ai_chat_threads 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('ACT');

ALTER TABLE ai_chat_messages 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('ACM');

ALTER TABLE activity_log 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('AL');

ALTER TABLE invoices 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('INV');

ALTER TABLE invoice_line_items 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('ILI');

ALTER TABLE links 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('L');

ALTER TABLE notifications 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('NTF');

ALTER TABLE time_entries 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('TE');

ALTER TABLE user_preferences 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('UP');

ALTER TABLE workspace_settings 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('WS');

-- =====================================================
-- PART 3: ADD MISSING CONSTRAINTS FOR SHORT_ID FORMAT
-- =====================================================

-- Add CHECK constraints for short_id format validation
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_short_id_format;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_short_id_format 
  CHECK (short_id ~ '^W-[a-z0-9]{4}$');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_short_id_format;
ALTER TABLE users ADD CONSTRAINT users_short_id_format 
  CHECK (short_id ~ '^U-[a-z0-9]{4}$');

ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_short_id_format;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_short_id_format 
  CHECK (short_id ~ '^WM-[a-z0-9]{4}$');

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_short_id_format;
ALTER TABLE projects ADD CONSTRAINT projects_short_id_format 
  CHECK (short_id ~ '^P-[a-z0-9]{4}$');

ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_short_id_format;
ALTER TABLE project_members ADD CONSTRAINT project_members_short_id_format 
  CHECK (short_id ~ '^PM-[a-z0-9]{4}$');

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_short_id_format;
ALTER TABLE tasks ADD CONSTRAINT tasks_short_id_format 
  CHECK (short_id ~ '^T-[a-z0-9]{4}$');

ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_short_id_format;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_short_id_format 
  CHECK (short_id ~ '^TE-[a-z0-9]{4}$');

ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_short_id_format;
ALTER TABLE folders ADD CONSTRAINT folders_short_id_format 
  CHECK (short_id ~ '^FD-[a-z0-9]{4}$');

ALTER TABLE files DROP CONSTRAINT IF EXISTS files_short_id_format;
ALTER TABLE files ADD CONSTRAINT files_short_id_format 
  CHECK (short_id ~ '^F-[a-z0-9]{4}$');

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_short_id_format;
ALTER TABLE notes ADD CONSTRAINT notes_short_id_format 
  CHECK (short_id ~ '^N-[a-z0-9]{4}$');

ALTER TABLE project_chat_messages DROP CONSTRAINT IF EXISTS project_chat_messages_short_id_format;
ALTER TABLE project_chat_messages ADD CONSTRAINT project_chat_messages_short_id_format 
  CHECK (short_id ~ '^PCM-[a-z0-9]{4}$');

ALTER TABLE ai_chat_threads DROP CONSTRAINT IF EXISTS ai_chat_threads_short_id_format;
ALTER TABLE ai_chat_threads ADD CONSTRAINT ai_chat_threads_short_id_format 
  CHECK (short_id ~ '^ACT-[a-z0-9]{4}$');

ALTER TABLE ai_chat_messages DROP CONSTRAINT IF EXISTS ai_chat_messages_short_id_format;
ALTER TABLE ai_chat_messages ADD CONSTRAINT ai_chat_messages_short_id_format 
  CHECK (short_id ~ '^ACM-[a-z0-9]{4}$');

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_short_id_format;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_short_id_format 
  CHECK (short_id ~ '^AL-[a-z0-9]{4}$');

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_short_id_format;
ALTER TABLE invoices ADD CONSTRAINT invoices_short_id_format 
  CHECK (short_id ~ '^INV-[a-z0-9]{4}$');

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_short_id_format;
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_short_id_format 
  CHECK (short_id ~ '^ILI-[a-z0-9]{4}$');

ALTER TABLE links DROP CONSTRAINT IF EXISTS links_short_id_format;
ALTER TABLE links ADD CONSTRAINT links_short_id_format 
  CHECK (short_id ~ '^L-[a-z0-9]{4}$');

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_short_id_format;
ALTER TABLE notifications ADD CONSTRAINT notifications_short_id_format 
  CHECK (short_id ~ '^NTF-[a-z0-9]{4}$');