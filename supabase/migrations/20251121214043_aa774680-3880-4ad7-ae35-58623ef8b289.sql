-- Drop the old trigger first
DROP TRIGGER IF EXISTS project_chat_notification_trigger ON public.project_chat_messages;

-- Recreate the function with the new URL format
CREATE OR REPLACE FUNCTION public.create_project_chat_notification()
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

-- Recreate the trigger
CREATE TRIGGER project_chat_notification_trigger
AFTER INSERT ON public.project_chat_messages
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION public.create_project_chat_notification();