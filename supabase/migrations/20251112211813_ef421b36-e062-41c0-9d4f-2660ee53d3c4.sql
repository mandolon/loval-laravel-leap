-- Create chat_read_receipts table to track which messages users have read
CREATE TABLE public.chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('workspace', 'project')),
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('CRR'),
  CONSTRAINT chat_read_receipts_workspace_or_project CHECK (
    (workspace_id IS NOT NULL AND project_id IS NULL AND message_type = 'workspace') OR
    (project_id IS NOT NULL AND workspace_id IS NULL AND message_type = 'project')
  )
);

-- Add indexes for performance
CREATE INDEX idx_chat_read_receipts_user_workspace ON public.chat_read_receipts(user_id, workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_chat_read_receipts_user_project ON public.chat_read_receipts(user_id, project_id) WHERE project_id IS NOT NULL;
CREATE UNIQUE INDEX idx_chat_read_receipts_user_workspace_unique ON public.chat_read_receipts(user_id, workspace_id) WHERE workspace_id IS NOT NULL;
CREATE UNIQUE INDEX idx_chat_read_receipts_user_project_unique ON public.chat_read_receipts(user_id, project_id) WHERE project_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own read receipts"
ON public.chat_read_receipts FOR SELECT
USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can insert their own read receipts"
ON public.chat_read_receipts FOR INSERT
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update their own read receipts"
ON public.chat_read_receipts FOR UPDATE
USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id))
WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- Add trigger for updated_at
CREATE TRIGGER update_chat_read_receipts_updated_at
BEFORE UPDATE ON public.chat_read_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();