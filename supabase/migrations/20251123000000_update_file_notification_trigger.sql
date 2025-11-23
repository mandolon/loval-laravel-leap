-- =====================================================
-- Update File Notification Trigger
-- =====================================================
-- Changes:
-- 1. Change notification type from 'model_added' to 'file_added'
-- 2. Support ALL file types (not just IFC)
-- 3. Update metadata structure to include fileName and fileCount
-- 4. Update title and content to be more generic
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS model_added_notification_trigger ON public.files;

-- Update function to create file added notifications
CREATE OR REPLACE FUNCTION create_file_added_notification()
RETURNS TRIGGER AS $$
DECLARE
  uploader_name TEXT;
  file_name TEXT;
  project_name TEXT;
  workspace_name TEXT;
  workspace_id_val UUID;
  member_record RECORD;
BEGIN
  -- Get uploader name
  SELECT name INTO uploader_name
  FROM public.users
  WHERE id = NEW.uploaded_by;

  -- Get file name
  file_name := NEW.file_name;

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
      'file_added',
      uploader_name || ' added files to ' || project_name,
      file_name,
      '/team/workspace/' || workspace_id_val || '/project/' || NEW.project_id,
      jsonb_build_object(
        'actorId', NEW.uploaded_by,
        'actorName', uploader_name,
        'projectId', NEW.project_id,
        'projectName', project_name,
        'workspaceId', workspace_id_val,
        'workspaceName', workspace_name,
        'fileId', NEW.id,
        'fileName', file_name,
        'fileCount', 1
      ),
      NEW.created_at
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger for ALL file types
CREATE TRIGGER file_added_notification_trigger
AFTER INSERT ON public.files
FOR EACH ROW
WHEN (NEW.project_id IS NOT NULL AND NEW.deleted_at IS NULL)
EXECUTE FUNCTION create_file_added_notification();

-- =====================================================
-- Note: For batch uploads, each file will generate a separate notification.
-- The frontend can optionally group notifications by uploader/project/time.
-- =====================================================
