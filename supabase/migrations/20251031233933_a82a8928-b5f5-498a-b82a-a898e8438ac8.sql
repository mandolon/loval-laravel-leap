-- Enable RLS on all remaining tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Workspaces: Members can view their workspaces
CREATE POLICY "Members can view their workspaces"
ON public.workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Workspace Members: Members can view workspace membership
CREATE POLICY "Members can view workspace membership"
ON public.workspace_members FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Workspace Settings: Members can view their workspace settings
CREATE POLICY "Members can view workspace settings"
ON public.workspace_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_settings.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);

-- Users: All authenticated users can view all users (for collaboration features)
CREATE POLICY "Authenticated users can view users"
ON public.users FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Users: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (auth_id = auth.uid());

-- User Roles: Users can view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- User Preferences: Users can manage their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Folders: Workspace members can view folders for their workspace projects
CREATE POLICY "Workspace members can view folders"
ON public.folders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = folders.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Files: Workspace members can view files for their workspace projects
CREATE POLICY "Workspace members can view files"
ON public.files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = files.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- File Annotations: Workspace members can view annotations for their workspace files
CREATE POLICY "Workspace members can view file annotations"
ON public.file_annotations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = file_annotations.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
);

-- Tasks: Workspace members can view tasks for their workspace projects
CREATE POLICY "Workspace members can view tasks"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = tasks.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Notes: Workspace members can view notes for their workspace projects
CREATE POLICY "Workspace members can view notes"
ON public.notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = notes.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Links: Workspace members can view links for their workspace projects
CREATE POLICY "Workspace members can view links"
ON public.links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = links.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Invoices: Workspace members can view invoices for their workspace projects
CREATE POLICY "Workspace members can view invoices"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = invoices.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Invoice Line Items: Workspace members can view line items for their workspace invoices
CREATE POLICY "Workspace members can view invoice line items"
ON public.invoice_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invoices inv
    JOIN projects p ON p.id = inv.project_id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE inv.id = invoice_line_items.invoice_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND inv.deleted_at IS NULL
  )
);

-- Time Entries: Workspace members can view time entries for their workspace projects
CREATE POLICY "Workspace members can view time entries"
ON public.time_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = time_entries.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- Project Chat Messages: Workspace members can view messages for their workspace projects
CREATE POLICY "Workspace members can view project chat messages"
ON public.project_chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = project_chat_messages.project_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
    AND p.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- AI Chat Threads: Users can view their own AI chat threads
CREATE POLICY "Users can view their own AI chat threads"
ON public.ai_chat_threads FOR SELECT
USING (user_id = auth.uid() AND deleted_at IS NULL);

-- AI Chat Messages: Users can view messages from their threads
CREATE POLICY "Users can view their own AI chat messages"
ON public.ai_chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_chat_threads
    WHERE ai_chat_threads.id = ai_chat_messages.thread_id
    AND ai_chat_threads.user_id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- Activity Log: Workspace members can view activity for their workspace
CREATE POLICY "Workspace members can view activity log"
ON public.activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = activity_log.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.deleted_at IS NULL
  )
);