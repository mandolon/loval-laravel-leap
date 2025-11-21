-- Add metadata column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create workspace chat message notifications
CREATE OR REPLACE FUNCTION create_workspace_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  workspace_name TEXT;
  member_record RECORD;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name
  FROM public.users
  WHERE id = NEW.user_id;

  -- Get workspace name
  SELECT name INTO workspace_name
  FROM public.workspaces
  WHERE id = NEW.workspace_id;

  -- Create notification for all workspace members including the sender
  FOR member_record IN
    SELECT user_id
    FROM public.workspace_members
    WHERE workspace_id = NEW.workspace_id
    AND deleted_at IS NULL
  LOOP
    INSERT INTO public.notifications (
      user_id,
      workspace_id,
      type,
      title,
      content,
      action_url,
      metadata,
      created_at
    ) VALUES (
      member_record.user_id,
      NEW.workspace_id,
      'workspace_chat_message',
      sender_name || ' posted in ' || workspace_name,
      LEFT(NEW.content, 100),
      '/team/workspace/' || NEW.workspace_id || '/chat',
      jsonb_build_object(
        'actorId', NEW.user_id,
        'actorName', sender_name,
        'workspaceId', NEW.workspace_id,
        'workspaceName', workspace_name,
        'messageId', NEW.id,
        'messagePreview', LEFT(NEW.content, 100)
      ),
      NEW.created_at
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for workspace chat messages
DROP TRIGGER IF EXISTS workspace_chat_notification_trigger ON public.workspace_chat_messages;
CREATE TRIGGER workspace_chat_notification_trigger
AFTER INSERT ON public.workspace_chat_messages
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION create_workspace_chat_notification();

-- Function to create project chat message notifications
CREATE OR REPLACE FUNCTION create_project_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  project_name TEXT;
  workspace_name TEXT;
  workspace_id_val UUID;
  member_record RECORD;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name
  FROM public.users
  WHERE id = NEW.user_id;

  -- Get project and workspace info
  SELECT p.name, p.workspace_id, w.name
  INTO project_name, workspace_id_val, workspace_name
  FROM public.projects p
  JOIN public.workspaces w ON w.id = p.workspace_id
  WHERE p.id = NEW.project_id;

  -- Create notification for all project members including the sender
  FOR member_record IN
    SELECT user_id
    FROM public.project_members
    WHERE project_id = NEW.project_id
    AND deleted_at IS NULL
  LOOP
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
      member_record.user_id,
      workspace_id_val,
      NEW.project_id,
      'project_chat_message',
      sender_name || ' posted in ' || project_name,
      LEFT(NEW.content, 100),
      '/team/workspace/' || workspace_id_val || '/chat?project=' || NEW.project_id,
      jsonb_build_object(
        'actorId', NEW.user_id,
        'actorName', sender_name,
        'projectId', NEW.project_id,
        'projectName', project_name,
        'workspaceId', workspace_id_val,
        'workspaceName', workspace_name,
        'messageId', NEW.id,
        'messagePreview', LEFT(NEW.content, 100)
      ),
      NEW.created_at
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for project chat messages
DROP TRIGGER IF EXISTS project_chat_notification_trigger ON public.project_chat_messages;
CREATE TRIGGER project_chat_notification_trigger
AFTER INSERT ON public.project_chat_messages
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION create_project_chat_notification();

-- Function to create task assignment notifications
CREATE OR REPLACE FUNCTION create_task_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  assigner_name TEXT;
  assignee_name TEXT;
  task_title TEXT;
  project_name TEXT;
  workspace_name TEXT;
  workspace_id_val UUID;
BEGIN
  -- Only create notification if assigned_to changed
  IF NEW.assigned_to IS NULL OR (OLD.assigned_to IS NOT NULL AND OLD.assigned_to = NEW.assigned_to) THEN
    RETURN NEW;
  END IF;

  -- Get assigner name (user who made the assignment)
  SELECT name INTO assigner_name
  FROM public.users
  WHERE id = auth.uid();

  -- Get assignee name
  SELECT name INTO assignee_name
  FROM public.users
  WHERE id = NEW.assigned_to;

  -- Get task and project info
  SELECT t.title, p.name, p.workspace_id, w.name
  INTO task_title, project_name, workspace_id_val, workspace_name
  FROM public.tasks t
  JOIN public.projects p ON p.id = t.project_id
  JOIN public.workspaces w ON w.id = p.workspace_id
  WHERE t.id = NEW.id;

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
    NEW.assigned_to,
    workspace_id_val,
    NEW.project_id,
    'task_assigned',
    assigner_name || ' assigned you a task',
    task_title,
    '/team/workspace/' || workspace_id_val || '/tasks',
    jsonb_build_object(
      'actorId', auth.uid(),
      'actorName', assigner_name,
      'projectId', NEW.project_id,
      'projectName', project_name,
      'workspaceId', workspace_id_val,
      'workspaceName', workspace_name,
      'taskId', NEW.id,
      'taskTitle', task_title,
      'assignedToId', NEW.assigned_to,
      'assignedToName', assignee_name
    ),
    NEW.updated_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for task assignments
DROP TRIGGER IF EXISTS task_assignment_notification_trigger ON public.tasks;
CREATE TRIGGER task_assignment_notification_trigger
AFTER UPDATE ON public.tasks
FOR EACH ROW
WHEN (NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to))
EXECUTE FUNCTION create_task_assignment_notification();

-- Function to create model added notifications
CREATE OR REPLACE FUNCTION create_model_added_notification()
RETURNS TRIGGER AS $$
DECLARE
  uploader_name TEXT;
  model_name TEXT;
  project_name TEXT;
  workspace_name TEXT;
  workspace_id_val UUID;
  member_record RECORD;
BEGIN
  -- Get uploader name
  SELECT name INTO uploader_name
  FROM public.users
  WHERE id = NEW.uploaded_by;

  -- Get model filename as name
  model_name := NEW.file_name;

  -- Get project and workspace info
  SELECT p.name, p.workspace_id, w.name
  INTO project_name, workspace_id_val, workspace_name
  FROM public.projects p
  JOIN public.workspaces w ON w.id = p.workspace_id
  WHERE p.id = NEW.project_id;

  -- Create notification for all project members including the uploader
  FOR member_record IN
    SELECT user_id
    FROM public.project_members
    WHERE project_id = NEW.project_id
    AND deleted_at IS NULL
  LOOP
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
      member_record.user_id,
      workspace_id_val,
      NEW.project_id,
      'model_added',
      uploader_name || ' added a 3D model',
      model_name || ' to ' || project_name,
      '/team/workspace/' || workspace_id_val || '/project/' || NEW.project_id,
      jsonb_build_object(
        'actorId', NEW.uploaded_by,
        'actorName', uploader_name,
        'projectId', NEW.project_id,
        'projectName', project_name,
        'workspaceId', workspace_id_val,
        'workspaceName', workspace_name,
        'modelId', NEW.id,
        'modelName', model_name
      ),
      NEW.created_at
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for model uploads
DROP TRIGGER IF EXISTS model_added_notification_trigger ON public.files;
CREATE TRIGGER model_added_notification_trigger
AFTER INSERT ON public.files
FOR EACH ROW
WHEN (NEW.file_type = 'ifc' AND NEW.project_id IS NOT NULL)
EXECUTE FUNCTION create_model_added_notification();
