-- Enable realtime for all main tables

-- Set replica identity to full for all tables to capture complete row data
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.files REPLICA IDENTITY FULL;
ALTER TABLE public.folders REPLICA IDENTITY FULL;
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.links REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.invoice_line_items REPLICA IDENTITY FULL;
ALTER TABLE public.ai_chat_threads REPLICA IDENTITY FULL;
ALTER TABLE public.ai_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.time_entries REPLICA IDENTITY FULL;
ALTER TABLE public.activity_log REPLICA IDENTITY FULL;
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;
ALTER TABLE public.project_members REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.workspaces REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication (only if not already added)
DO $$
BEGIN
  -- Projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;

  -- Tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  -- Files
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'files'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
  END IF;

  -- Folders
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'folders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;
  END IF;

  -- Notes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
  END IF;

  -- Links
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'links'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.links;
  END IF;

  -- Invoices
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  END IF;

  -- Invoice line items
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'invoice_line_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_line_items;
  END IF;

  -- AI chat threads
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ai_chat_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_threads;
  END IF;

  -- AI chat messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ai_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;
  END IF;

  -- Time entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'time_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
  END IF;

  -- Activity log
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
  END IF;

  -- Workspace members
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workspace_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
  END IF;

  -- Project members
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
  END IF;

  -- Users
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;

  -- Workspaces
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workspaces'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
  END IF;

  -- Notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;