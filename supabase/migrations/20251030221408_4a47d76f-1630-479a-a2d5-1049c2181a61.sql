-- Create workspace_chat_messages table
CREATE TABLE public.workspace_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  reply_to_message_id UUID,
  referenced_files UUID[] DEFAULT '{}'::UUID[],
  referenced_tasks UUID[] DEFAULT '{}'::UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  short_id TEXT NOT NULL DEFAULT generate_short_id('WCM'::text)
);

-- Enable RLS
ALTER TABLE public.workspace_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_workspace_chat_messages_workspace_id ON public.workspace_chat_messages(workspace_id);
CREATE INDEX idx_workspace_chat_messages_user_id ON public.workspace_chat_messages(user_id);
CREATE INDEX idx_workspace_chat_messages_created_at ON public.workspace_chat_messages(created_at);

-- Create RLS policies
-- Users can view workspace chat messages if they are members of the workspace
CREATE POLICY "Workspace members can view workspace chat messages"
ON public.workspace_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspace_chat_messages.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Users can create workspace chat messages if they are members of the workspace
CREATE POLICY "Workspace members can create workspace chat messages"
ON public.workspace_chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspace_chat_messages.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.deleted_at IS NULL
  )
  AND user_id = auth.uid()
);

-- Users can update their own workspace chat messages
CREATE POLICY "Users can update their own workspace chat messages"
ON public.workspace_chat_messages
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can soft delete their own workspace chat messages
CREATE POLICY "Users can delete their own workspace chat messages"
ON public.workspace_chat_messages
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND deleted_at IS NOT NULL
  AND deleted_by = auth.uid()
);

-- Enable realtime for workspace chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_chat_messages;