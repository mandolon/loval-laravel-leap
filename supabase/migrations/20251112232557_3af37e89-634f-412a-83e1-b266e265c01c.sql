-- Step 1: Make all user reference columns nullable (except membership tables that CASCADE)
ALTER TABLE public.projects 
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN updated_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.tasks 
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN updated_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.files 
  ALTER COLUMN uploaded_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.workspace_files 
  ALTER COLUMN uploaded_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.folders 
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.workspace_folders 
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.notes 
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN updated_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.invoices 
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN updated_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.links 
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.drawings 
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.drawing_pages 
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.detail_library_files 
  ALTER COLUMN uploaded_by DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.detail_library_subfolders 
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.time_entries 
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.activity_log 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.notifications 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.project_chat_messages 
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.workspace_chat_messages 
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.ai_chat_threads 
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.ai_chat_messages 
  ALTER COLUMN deleted_by DROP NOT NULL;

ALTER TABLE public.file_annotations 
  ALTER COLUMN created_by DROP NOT NULL;

-- Step 2: Drop all existing foreign key constraints related to users
-- Projects
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey_new;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey_new_new;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_updated_by_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_deleted_by_fkey;

-- Tasks
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey_new;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey_new_new;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_updated_by_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_deleted_by_fkey;

-- Files
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_uploaded_by_fkey;
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_uploaded_by_fkey_new;
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_deleted_by_fkey;

-- Workspace Files
ALTER TABLE public.workspace_files DROP CONSTRAINT IF EXISTS workspace_files_uploaded_by_fkey;
ALTER TABLE public.workspace_files DROP CONSTRAINT IF EXISTS workspace_files_deleted_by_fkey;

-- Folders
ALTER TABLE public.folders DROP CONSTRAINT IF EXISTS folders_created_by_fkey;
ALTER TABLE public.folders DROP CONSTRAINT IF EXISTS folders_deleted_by_fkey;

-- Workspace Folders
ALTER TABLE public.workspace_folders DROP CONSTRAINT IF EXISTS workspace_folders_created_by_fkey;
ALTER TABLE public.workspace_folders DROP CONSTRAINT IF EXISTS workspace_folders_deleted_by_fkey;

-- Notes
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_created_by_fkey;
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_updated_by_fkey;
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_deleted_by_fkey;

-- Invoices
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_updated_by_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_deleted_by_fkey;

-- Links
ALTER TABLE public.links DROP CONSTRAINT IF EXISTS links_created_by_fkey;
ALTER TABLE public.links DROP CONSTRAINT IF EXISTS links_deleted_by_fkey;

-- Drawings
ALTER TABLE public.drawings DROP CONSTRAINT IF EXISTS drawings_created_by_fkey;
ALTER TABLE public.drawings DROP CONSTRAINT IF EXISTS drawings_deleted_by_fkey;

-- Drawing Pages
ALTER TABLE public.drawing_pages DROP CONSTRAINT IF EXISTS drawing_pages_deleted_by_fkey;

-- Detail Library Files
ALTER TABLE public.detail_library_files DROP CONSTRAINT IF EXISTS detail_library_files_uploaded_by_fkey;
ALTER TABLE public.detail_library_files DROP CONSTRAINT IF EXISTS detail_library_files_deleted_by_fkey;

-- Detail Library Subfolders
ALTER TABLE public.detail_library_subfolders DROP CONSTRAINT IF EXISTS detail_library_subfolders_created_by_fkey;

-- Time Entries
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_user_id_fkey;
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_deleted_by_fkey;

-- Activity Log
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

-- Notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Project Chat Messages
ALTER TABLE public.project_chat_messages DROP CONSTRAINT IF EXISTS project_chat_messages_user_id_fkey;
ALTER TABLE public.project_chat_messages DROP CONSTRAINT IF EXISTS project_chat_messages_deleted_by_fkey;

-- Workspace Chat Messages
ALTER TABLE public.workspace_chat_messages DROP CONSTRAINT IF EXISTS workspace_chat_messages_user_id_fkey;
ALTER TABLE public.workspace_chat_messages DROP CONSTRAINT IF EXISTS workspace_chat_messages_deleted_by_fkey;

-- AI Chat Threads
ALTER TABLE public.ai_chat_threads DROP CONSTRAINT IF EXISTS ai_chat_threads_user_id_fkey;
ALTER TABLE public.ai_chat_threads DROP CONSTRAINT IF EXISTS ai_chat_threads_deleted_by_fkey;

-- AI Chat Messages
ALTER TABLE public.ai_chat_messages DROP CONSTRAINT IF EXISTS ai_chat_messages_deleted_by_fkey;

-- File Annotations
ALTER TABLE public.file_annotations DROP CONSTRAINT IF EXISTS file_annotations_created_by_fkey;

-- Project Members
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_deleted_by_fkey;

-- Workspace Members
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_deleted_by_fkey;

-- User Preferences
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

-- User Roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Chat Read Receipts
ALTER TABLE public.chat_read_receipts DROP CONSTRAINT IF EXISTS chat_read_receipts_user_id_fkey;

-- Step 3: Recreate all foreign key constraints with correct ON DELETE behavior

-- Content Tables: ON DELETE SET NULL (preserve content, show [Deleted User])

-- Projects
ALTER TABLE public.projects 
  ADD CONSTRAINT projects_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.projects 
  ADD CONSTRAINT projects_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.projects 
  ADD CONSTRAINT projects_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Tasks
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Files
ALTER TABLE public.files 
  ADD CONSTRAINT files_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.files 
  ADD CONSTRAINT files_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Workspace Files
ALTER TABLE public.workspace_files 
  ADD CONSTRAINT workspace_files_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.workspace_files 
  ADD CONSTRAINT workspace_files_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Folders
ALTER TABLE public.folders 
  ADD CONSTRAINT folders_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.folders 
  ADD CONSTRAINT folders_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Workspace Folders
ALTER TABLE public.workspace_folders 
  ADD CONSTRAINT workspace_folders_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.workspace_folders 
  ADD CONSTRAINT workspace_folders_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Notes
ALTER TABLE public.notes 
  ADD CONSTRAINT notes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.notes 
  ADD CONSTRAINT notes_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.notes 
  ADD CONSTRAINT notes_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Invoices
ALTER TABLE public.invoices 
  ADD CONSTRAINT invoices_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.invoices 
  ADD CONSTRAINT invoices_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.invoices 
  ADD CONSTRAINT invoices_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Links
ALTER TABLE public.links 
  ADD CONSTRAINT links_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.links 
  ADD CONSTRAINT links_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Drawings
ALTER TABLE public.drawings 
  ADD CONSTRAINT drawings_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.drawings 
  ADD CONSTRAINT drawings_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Drawing Pages
ALTER TABLE public.drawing_pages 
  ADD CONSTRAINT drawing_pages_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Detail Library Files
ALTER TABLE public.detail_library_files 
  ADD CONSTRAINT detail_library_files_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.detail_library_files 
  ADD CONSTRAINT detail_library_files_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Detail Library Subfolders
ALTER TABLE public.detail_library_subfolders 
  ADD CONSTRAINT detail_library_subfolders_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Time Entries
ALTER TABLE public.time_entries 
  ADD CONSTRAINT time_entries_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.time_entries 
  ADD CONSTRAINT time_entries_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Activity Log
ALTER TABLE public.activity_log 
  ADD CONSTRAINT activity_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Notifications
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Project Chat Messages
ALTER TABLE public.project_chat_messages 
  ADD CONSTRAINT project_chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.project_chat_messages 
  ADD CONSTRAINT project_chat_messages_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Workspace Chat Messages
ALTER TABLE public.workspace_chat_messages 
  ADD CONSTRAINT workspace_chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.workspace_chat_messages 
  ADD CONSTRAINT workspace_chat_messages_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- AI Chat Threads
ALTER TABLE public.ai_chat_threads 
  ADD CONSTRAINT ai_chat_threads_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.ai_chat_threads 
  ADD CONSTRAINT ai_chat_threads_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- AI Chat Messages
ALTER TABLE public.ai_chat_messages 
  ADD CONSTRAINT ai_chat_messages_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- File Annotations
ALTER TABLE public.file_annotations 
  ADD CONSTRAINT file_annotations_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Membership Tables: ON DELETE CASCADE (clean up user-specific records)

-- Project Members
ALTER TABLE public.project_members 
  ADD CONSTRAINT project_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.project_members 
  ADD CONSTRAINT project_members_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Workspace Members
ALTER TABLE public.workspace_members 
  ADD CONSTRAINT workspace_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_members 
  ADD CONSTRAINT workspace_members_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- User Preferences
ALTER TABLE public.user_preferences 
  ADD CONSTRAINT user_preferences_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- User Roles
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Chat Read Receipts
ALTER TABLE public.chat_read_receipts 
  ADD CONSTRAINT chat_read_receipts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;