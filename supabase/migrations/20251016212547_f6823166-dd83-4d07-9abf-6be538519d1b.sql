-- ============================================================================
-- Phase 1: Add Missing Tables (9 new tables)
-- ============================================================================

-- 1. User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  short_id TEXT NOT NULL DEFAULT generate_short_id('UP'),
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notifications_enabled BOOLEAN DEFAULT true,
  email_digest TEXT DEFAULT 'daily' CHECK (email_digest IN ('none', 'daily', 'weekly')),
  sidebar_collapsed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Workspace Settings Table
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  short_id TEXT NOT NULL DEFAULT generate_short_id('WS'),
  default_invoice_terms TEXT,
  company_name TEXT,
  company_logo_url TEXT,
  tax_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- 3. Time Entries Table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('TE'),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  duration_hours NUMERIC(10, 2) NOT NULL CHECK (duration_hours > 0),
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- 4. Project Chat Messages Table
CREATE TABLE IF NOT EXISTS public.project_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('PCM'),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  referenced_files UUID[] DEFAULT '{}'::uuid[],
  referenced_tasks UUID[] DEFAULT '{}'::uuid[],
  reply_to_message_id UUID REFERENCES public.project_chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- 5. AI Chat Threads Table
CREATE TABLE IF NOT EXISTS public.ai_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('ACT'),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- 6. AI Chat Messages Table
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('ACM'),
  thread_id UUID NOT NULL REFERENCES public.ai_chat_threads(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  referenced_projects UUID[] DEFAULT '{}'::uuid[],
  referenced_files UUID[] DEFAULT '{}'::uuid[],
  referenced_tasks UUID[] DEFAULT '{}'::uuid[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Activity Log Table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('AL'),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Links Table
CREATE TABLE IF NOT EXISTS public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('L'),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('NTF'),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Phase 2: Create Indexes for Performance
-- ============================================================================

-- User Preferences Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_short_id ON public.user_preferences(short_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Workspace Settings Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_settings_short_id ON public.workspace_settings(short_id);
CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id ON public.workspace_settings(workspace_id);

-- Time Entries Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_short_id ON public.time_entries(short_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON public.time_entries(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON public.time_entries(task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date ON public.time_entries(entry_date DESC) WHERE deleted_at IS NULL;

-- Project Chat Messages Indexes
CREATE INDEX IF NOT EXISTS idx_project_chat_messages_short_id ON public.project_chat_messages(short_id);
CREATE INDEX IF NOT EXISTS idx_project_chat_messages_project_id ON public.project_chat_messages(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_chat_messages_user_id ON public.project_chat_messages(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_chat_messages_created_at ON public.project_chat_messages(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_chat_messages_reply_to ON public.project_chat_messages(reply_to_message_id) WHERE deleted_at IS NULL;

-- AI Chat Threads Indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_short_id ON public.ai_chat_threads(short_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_workspace_id ON public.ai_chat_threads(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_user_id ON public.ai_chat_threads(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_created_at ON public.ai_chat_threads(created_at DESC) WHERE deleted_at IS NULL;

-- AI Chat Messages Indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_short_id ON public.ai_chat_messages(short_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_thread_id ON public.ai_chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON public.ai_chat_messages(created_at ASC);

-- Activity Log Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_short_id ON public.activity_log(short_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON public.activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON public.activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON public.activity_log(resource_type, resource_id);

-- Links Indexes
CREATE INDEX IF NOT EXISTS idx_links_short_id ON public.links(short_id);
CREATE INDEX IF NOT EXISTS idx_links_project_id ON public.links(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_links_created_by ON public.links(created_by) WHERE deleted_at IS NULL;

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_short_id ON public.notifications(short_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON public.notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON public.notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================================
-- Phase 3: Create Triggers for Auto-Updates
-- ============================================================================

-- Trigger: Auto-update updated_at for new tables
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_chat_messages_updated_at
  BEFORE UPDATE ON public.project_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_chat_threads_updated_at
  BEFORE UPDATE ON public.ai_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_links_updated_at
  BEFORE UPDATE ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();