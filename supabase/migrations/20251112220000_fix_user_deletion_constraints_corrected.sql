-- Fix Foreign Key Constraints to Allow User Deletion
-- This migration updates ALL foreign key constraints to use ON DELETE SET NULL
-- to preserve content when users are deleted, except for cleanup tables which use CASCADE

-- ============================================================================
-- PROJECTS TABLE (has "_new_" suffix constraints)
-- ============================================================================
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_new_created_by_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_new_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_new_updated_by_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_new_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_new_deleted_by_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_new_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- TASKS TABLE (has "_new_" suffix constraints)
-- ============================================================================
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_new_created_by_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_new_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_new_updated_by_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_new_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_new_deleted_by_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_new_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- FILES TABLE (has duplicate constraints - clean them all up)
-- ============================================================================
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_uploaded_by_fkey;
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_new_deleted_by_fkey;
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_deleted_by_fkey;

ALTER TABLE files ADD CONSTRAINT files_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE files ADD CONSTRAINT files_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- FOLDERS TABLE (has duplicate constraints - clean them all up)
-- ============================================================================
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_created_by_fkey;
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_new_deleted_by_fkey;
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_deleted_by_fkey;

ALTER TABLE folders ADD CONSTRAINT folders_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE folders ADD CONSTRAINT folders_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- NOTES TABLE
-- ============================================================================
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_created_by_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_updated_by_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_deleted_by_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_updated_by_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_deleted_by_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- DRAWINGS TABLE
-- ============================================================================
ALTER TABLE drawings DROP CONSTRAINT IF EXISTS drawings_created_by_fkey;
ALTER TABLE drawings ADD CONSTRAINT drawings_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE drawings DROP CONSTRAINT IF EXISTS drawings_deleted_by_fkey;
ALTER TABLE drawings ADD CONSTRAINT drawings_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- DRAWING_PAGES TABLE
-- ============================================================================
ALTER TABLE drawing_pages DROP CONSTRAINT IF EXISTS drawing_pages_deleted_by_fkey;
ALTER TABLE drawing_pages ADD CONSTRAINT drawing_pages_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- WORKSPACE_FOLDERS TABLE
-- ============================================================================
ALTER TABLE workspace_folders DROP CONSTRAINT IF EXISTS workspace_folders_created_by_fkey;
ALTER TABLE workspace_folders ADD CONSTRAINT workspace_folders_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE workspace_folders DROP CONSTRAINT IF EXISTS workspace_folders_deleted_by_fkey;
ALTER TABLE workspace_folders ADD CONSTRAINT workspace_folders_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- WORKSPACE_FILES TABLE
-- ============================================================================
ALTER TABLE workspace_files DROP CONSTRAINT IF EXISTS workspace_files_uploaded_by_fkey;
ALTER TABLE workspace_files ADD CONSTRAINT workspace_files_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE workspace_files DROP CONSTRAINT IF EXISTS workspace_files_deleted_by_fkey;
ALTER TABLE workspace_files ADD CONSTRAINT workspace_files_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- DETAIL_LIBRARY_FILES TABLE
-- ============================================================================
ALTER TABLE detail_library_files DROP CONSTRAINT IF EXISTS detail_library_files_uploaded_by_fkey;
ALTER TABLE detail_library_files ADD CONSTRAINT detail_library_files_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE detail_library_files DROP CONSTRAINT IF EXISTS detail_library_files_deleted_by_fkey;
ALTER TABLE detail_library_files ADD CONSTRAINT detail_library_files_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- DETAIL_LIBRARY_SUBFOLDERS TABLE
-- ============================================================================
ALTER TABLE detail_library_subfolders DROP CONSTRAINT IF EXISTS detail_library_subfolders_created_by_fkey;
ALTER TABLE detail_library_subfolders ADD CONSTRAINT detail_library_subfolders_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- FILE_ANNOTATIONS TABLE
-- ============================================================================
ALTER TABLE file_annotations DROP CONSTRAINT IF EXISTS file_annotations_created_by_fkey;
ALTER TABLE file_annotations ADD CONSTRAINT file_annotations_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- CHANGE CASCADE TO SET NULL (preserve content)
-- ============================================================================

-- ACTIVITY_LOG (preserve activity history)
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- AI_CHAT_THREADS (preserve AI chat history)
ALTER TABLE ai_chat_threads DROP CONSTRAINT IF EXISTS ai_chat_threads_user_id_fkey;
ALTER TABLE ai_chat_threads ADD CONSTRAINT ai_chat_threads_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ai_chat_threads DROP CONSTRAINT IF EXISTS ai_chat_threads_deleted_by_fkey;
ALTER TABLE ai_chat_threads ADD CONSTRAINT ai_chat_threads_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- AI_CHAT_MESSAGES (preserve AI messages)
ALTER TABLE ai_chat_messages DROP CONSTRAINT IF EXISTS ai_chat_messages_deleted_by_fkey;
ALTER TABLE ai_chat_messages ADD CONSTRAINT ai_chat_messages_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- LINKS (preserve links)
ALTER TABLE links DROP CONSTRAINT IF EXISTS links_created_by_fkey;
ALTER TABLE links ADD CONSTRAINT links_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- NOTIFICATIONS (preserve notification records)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- PROJECT_CHAT_MESSAGES (preserve chat messages)
ALTER TABLE project_chat_messages DROP CONSTRAINT IF EXISTS project_chat_messages_user_id_fkey;
ALTER TABLE project_chat_messages ADD CONSTRAINT project_chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE project_chat_messages DROP CONSTRAINT IF EXISTS project_chat_messages_deleted_by_fkey;
ALTER TABLE project_chat_messages ADD CONSTRAINT project_chat_messages_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- WORKSPACE_CHAT_MESSAGES (preserve chat messages)
ALTER TABLE workspace_chat_messages DROP CONSTRAINT IF EXISTS workspace_chat_messages_user_id_fkey;
ALTER TABLE workspace_chat_messages ADD CONSTRAINT workspace_chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE workspace_chat_messages DROP CONSTRAINT IF EXISTS workspace_chat_messages_deleted_by_fkey;
ALTER TABLE workspace_chat_messages ADD CONSTRAINT workspace_chat_messages_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- TIME_ENTRIES (preserve time records)
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_user_id_fkey;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_deleted_by_fkey;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- PROJECT_MEMBERS and WORKSPACE_MEMBERS (deleted_by should be SET NULL)
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_deleted_by_fkey;
ALTER TABLE project_members ADD CONSTRAINT project_members_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_deleted_by_fkey;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- USERS (self-reference for deleted_by)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_deleted_by_fkey;
ALTER TABLE users ADD CONSTRAINT users_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- KEEP CASCADE (for cleanup tables)
-- Note: These already have CASCADE and should remain that way:
-- - user_preferences.user_id (CASCADE)
-- - user_roles.user_id (CASCADE)
-- - project_members.user_id (CASCADE)
-- - workspace_members.user_id (CASCADE)
-- - chat_read_receipts.user_id (CASCADE)
-- ============================================================================

COMMENT ON MIGRATION IS 'Fix all foreign key constraints to allow user deletion while preserving content';
