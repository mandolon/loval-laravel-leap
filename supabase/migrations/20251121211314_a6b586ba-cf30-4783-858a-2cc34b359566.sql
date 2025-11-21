-- Add metadata column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Function to create workspace chat message notifications
CREATE OR REPLACE FUNCTION public.create_workspace_chat_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Trigger for workspace chat messages
DROP TRIGGER IF EXISTS workspace_chat_notification_trigger ON public.workspace_chat_messages;
CREATE TRIGGER workspace_chat_notification_trigger
AFTER INSERT ON public.workspace_chat_messages
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION public.create_workspace_chat_notification();

-- Function to create project chat message notifications
CREATE OR REPLACE FUNCTION public.create_project_chat_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      '/team/workspace/' || workspace_id_val || '/project/' || NEW.project_id,
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
$$;

-- Trigger for project chat messages
DROP TRIGGER IF EXISTS project_chat_notification_trigger ON public.project_chat_messages;
CREATE TRIGGER project_chat_notification_trigger
AFTER INSERT ON public.project_chat_messages
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION public.create_project_chat_notification();

-- Function to create model added notifications
CREATE OR REPLACE FUNCTION public.create_model_added_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  model_name := NEW.filename;

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
$$;

-- Trigger for model uploads (IFC files only)
DROP TRIGGER IF EXISTS model_added_notification_trigger ON public.files;
CREATE TRIGGER model_added_notification_trigger
AFTER INSERT ON public.files
FOR EACH ROW
WHEN ((NEW.mimetype IN ('application/x-step', 'model/ifc', 'application/octet-stream') 
       OR NEW.filename ILIKE '%.ifc') 
      AND NEW.project_id IS NOT NULL)
EXECUTE FUNCTION public.create_model_added_notification();