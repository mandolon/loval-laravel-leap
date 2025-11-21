-- =====================================================
-- Create Requests Table for Team Request Feature
-- =====================================================

-- Create Requests Table
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('REQ'),

  -- Core fields
  title text NOT NULL,
  body text NOT NULL,

  -- Relationships
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Status and dates
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  respond_by date,

  -- Unread tracking (for the assigned user)
  is_unread boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),

  CONSTRAINT requests_short_id_format CHECK (short_id ~ '^REQ-[a-z0-9]{4}$')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_short_id ON requests(short_id);
CREATE INDEX IF NOT EXISTS idx_requests_workspace ON requests(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_project ON requests(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status) WHERE deleted_at IS NULL;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_requests_updated_at ON requests;
CREATE TRIGGER trigger_update_requests_updated_at
BEFORE UPDATE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view requests in their workspace
CREATE POLICY "Users can view workspace requests" ON requests
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- Users can create requests in their workspace
CREATE POLICY "Users can create requests" ON requests
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
  AND created_by_user_id = auth.uid()
);

-- Users can update requests in their workspace
CREATE POLICY "Users can update workspace requests" ON requests
FOR UPDATE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  )
);

-- Users can delete their own requests
CREATE POLICY "Users can delete their requests" ON requests
FOR UPDATE USING (
  created_by_user_id = auth.uid()
);

-- Enable realtime for requests
ALTER PUBLICATION supabase_realtime ADD TABLE requests;

-- Function to create request notification
CREATE OR REPLACE FUNCTION create_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
  assignee_name TEXT;
  project_name TEXT;
  workspace_name TEXT;
BEGIN
  -- Get creator name
  SELECT name INTO creator_name
  FROM public.users
  WHERE id = NEW.created_by_user_id;

  -- Get assignee name
  SELECT name INTO assignee_name
  FROM public.users
  WHERE id = NEW.assigned_to_user_id;

  -- Get workspace name
  SELECT name INTO workspace_name
  FROM public.workspaces
  WHERE id = NEW.workspace_id;

  -- Get project name if project_id is set
  IF NEW.project_id IS NOT NULL THEN
    SELECT name INTO project_name
    FROM public.projects
    WHERE id = NEW.project_id;
  END IF;

  -- Create notification for the assignee
  INSERT INTO public.notifications (
    user_id,
    workspace_id,
    project_id,
    type,
    title,
    content,
    action_url,
    metadata,
    created_at
  ) VALUES (
    NEW.assigned_to_user_id,
    NEW.workspace_id,
    NEW.project_id,
    'request_created',
    creator_name || ' sent you a request',
    LEFT(NEW.title, 100),
    '/team/workspace/' || NEW.workspace_id || '/requests',
    jsonb_build_object(
      'actorId', NEW.created_by_user_id,
      'actorName', creator_name,
      'requestId', NEW.id,
      'requestTitle', NEW.title,
      'assignedToId', NEW.assigned_to_user_id,
      'assignedToName', assignee_name,
      'projectId', NEW.project_id,
      'projectName', project_name,
      'workspaceId', NEW.workspace_id,
      'workspaceName', workspace_name
    ),
    NEW.created_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for request creation notifications
DROP TRIGGER IF EXISTS request_notification_trigger ON public.requests;
CREATE TRIGGER request_notification_trigger
AFTER INSERT ON public.requests
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION create_request_notification();
