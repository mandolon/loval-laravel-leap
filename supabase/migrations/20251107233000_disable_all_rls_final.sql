-- FINAL FIX: Disable Row Level Security on ALL tables
-- This restores the working state from commit 20251031234845
-- The application uses UI-based access control, not database-level RLS
-- This migration is idempotent and safe to run multiple times

-- ============================================================
-- STEP 1: Drop ALL existing RLS policies
-- ============================================================

-- Workspace-related policies
DROP POLICY IF EXISTS "Allow authenticated users to select workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to insert workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to delete workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete workspaces" ON workspaces;

-- Workspace members policies
DROP POLICY IF EXISTS "Allow authenticated users to select workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated users to insert workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated users to update workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated users to delete workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members" ON workspace_members;

-- Users policies
DROP POLICY IF EXISTS "Allow authenticated users to select users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to delete users" ON users;
DROP POLICY IF EXISTS "Users can view workspace members" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Projects policies
DROP POLICY IF EXISTS "Users can view workspace projects" ON projects;
DROP POLICY IF EXISTS "Users can view workspace projects" ON projects_new;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects_new;
DROP POLICY IF EXISTS "Users can update workspace projects" ON projects;
DROP POLICY IF EXISTS "Users can update workspace projects" ON projects_new;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects_new;

-- Tasks policies
DROP POLICY IF EXISTS "Users can view project tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view project tasks" ON tasks_new;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks_new;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks_new;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks_new;

-- Files policies
DROP POLICY IF EXISTS "Users can view project files" ON files;
DROP POLICY IF EXISTS "Users can create files" ON files;
DROP POLICY IF EXISTS "Users can update files" ON files;
DROP POLICY IF EXISTS "Users can delete files" ON files;

-- Folders policies
DROP POLICY IF EXISTS "Users can view project folders" ON folders;
DROP POLICY IF EXISTS "Users can create folders" ON folders;
DROP POLICY IF EXISTS "Users can update folders" ON folders;
DROP POLICY IF EXISTS "Users can delete folders" ON folders;

-- Drawing pages policies
DROP POLICY IF EXISTS "Workspace members can view drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can insert drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can update drawing pages" ON drawing_pages;
DROP POLICY IF EXISTS "Workspace members can delete drawing pages" ON drawing_pages;

-- Detail library policies
DROP POLICY IF EXISTS "Workspace members can view categories" ON detail_library_categories;
DROP POLICY IF EXISTS "Workspace members can manage categories" ON detail_library_categories;
DROP POLICY IF EXISTS "Workspace members can view items" ON detail_library_items;
DROP POLICY IF EXISTS "Workspace members can manage items" ON detail_library_items;
DROP POLICY IF EXISTS "Workspace members can view files" ON detail_library_files;
DROP POLICY IF EXISTS "Workspace members can manage files" ON detail_library_files;
DROP POLICY IF EXISTS "Workspace members can view subfolders" ON detail_library_subfolders;
DROP POLICY IF EXISTS "Workspace members can manage subfolders" ON detail_library_subfolders;

-- ============================================================
-- STEP 2: Disable RLS on ALL tables
-- ============================================================

ALTER TABLE IF EXISTS public.activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_chat_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detail_library_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detail_library_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detail_library_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detail_library_subfolders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drawing_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drawing_scales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drawings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_annotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.links DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_files DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: Clean up any helper functions that were RLS-related
-- ============================================================

DROP FUNCTION IF EXISTS public.get_public_user_id();

-- ============================================================
-- Verification comment
-- ============================================================

-- This migration ensures ALL tables have RLS disabled and ALL policies removed
-- The application architecture relies on UI-based access control
-- Database queries should work without RLS blocking access
