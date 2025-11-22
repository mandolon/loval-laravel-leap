-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('REQ'),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  respond_by TIMESTAMP WITH TIME ZONE,
  is_unread BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_requests_workspace_id ON requests(workspace_id);
CREATE INDEX idx_requests_project_id ON requests(project_id);
CREATE INDEX idx_requests_created_by_user_id ON requests(created_by_user_id);
CREATE INDEX idx_requests_assigned_to_user_id ON requests(assigned_to_user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_deleted_at ON requests(deleted_at);
CREATE INDEX idx_requests_created_at ON requests(created_at);

-- Create unique constraint on short_id
CREATE UNIQUE INDEX idx_requests_short_id ON requests(short_id);

-- Create trigger for updated_at
CREATE TRIGGER update_requests_updated_at
BEFORE UPDATE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- NO RLS - Using UI filtering only per requirements
-- RLS is intentionally disabled to rely on application-level filtering

-- Enable realtime for requests
ALTER PUBLICATION supabase_realtime ADD TABLE requests;

-- Create notification function for new requests
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

  -- Get assignee name if assigned
  IF NEW.assigned_to_user_id IS NOT NULL THEN
    SELECT name INTO assignee_name
    FROM public.users
    WHERE id = NEW.assigned_to_user_id;
  END IF;

  -- Get project name if associated
  IF NEW.project_id IS NOT NULL THEN
    SELECT name INTO project_name
    FROM public.projects
    WHERE id = NEW.project_id;
  END IF;

  -- Get workspace name
  SELECT name INTO workspace_name
  FROM public.workspaces
  WHERE id = NEW.workspace_id;

  -- Create notification for assignee if assigned
  IF NEW.assigned_to_user_id IS NOT NULL THEN
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
      'request_assigned',
      creator_name || ' assigned you a request',
      NEW.title,
      '/team/workspace/' || NEW.workspace_id || '/requests?request=' || NEW.id,
      jsonb_build_object(
        'actorId', NEW.created_by_user_id,
        'actorName', creator_name,
        'requestId', NEW.id,
        'requestTitle', NEW.title,
        'projectId', NEW.project_id,
        'projectName', project_name,
        'workspaceId', NEW.workspace_id,
        'workspaceName', workspace_name
      ),
      NEW.created_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for request notifications
CREATE TRIGGER request_notification_trigger
AFTER INSERT ON public.requests
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION create_request_notification();