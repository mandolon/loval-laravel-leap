-- Drop old cron-based approach
DROP TRIGGER IF EXISTS track_task_assignments_trigger ON tasks;
DROP FUNCTION IF EXISTS track_task_assignments();
DROP FUNCTION IF EXISTS create_confirmed_task_assignment_notifications();

-- Function to process pending task assignments and create notifications
CREATE OR REPLACE FUNCTION process_pending_task_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_record RECORD;
  assigner_name TEXT;
  assignee_name TEXT;
  task_title TEXT;
  project_name TEXT;
  workspace_name TEXT;
  workspace_id_val UUID;
  current_assignees UUID[];
BEGIN
  -- Find assignments that are 4+ minutes old
  FOR pending_record IN
    SELECT * FROM pending_task_assignments
    WHERE assigned_at <= (now() - INTERVAL '4 minutes')
  LOOP
    -- Verify the assignee is still assigned to the task
    SELECT assignees INTO current_assignees
    FROM tasks
    WHERE id = pending_record.task_id;

    -- Only create notification if assignee is still in the current assignees array
    IF pending_record.assignee_id = ANY(current_assignees) THEN
      -- Get names and project info
      SELECT name INTO assigner_name FROM users WHERE id = pending_record.assigned_by;
      SELECT name INTO assignee_name FROM users WHERE id = pending_record.assignee_id;
      
      SELECT t.title, p.name, p.workspace_id, w.name
      INTO task_title, project_name, workspace_id_val, workspace_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE t.id = pending_record.task_id;

      -- Create notification
      INSERT INTO notifications (
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
        pending_record.assignee_id,
        workspace_id_val,
        (SELECT project_id FROM tasks WHERE id = pending_record.task_id),
        'task_assigned',
        COALESCE(assigner_name, 'Someone') || ' assigned you a task',
        task_title,
        '/team/workspace/' || workspace_id_val || '/project/' || (SELECT project_id FROM tasks WHERE id = pending_record.task_id) || '/tasks',
        jsonb_build_object(
          'actorId', pending_record.assigned_by,
          'actorName', COALESCE(assigner_name, 'Unknown'),
          'projectId', (SELECT project_id FROM tasks WHERE id = pending_record.task_id),
          'projectName', project_name,
          'workspaceId', workspace_id_val,
          'workspaceName', workspace_name,
          'taskId', pending_record.task_id,
          'taskTitle', task_title,
          'assignedToId', pending_record.assignee_id,
          'assignedToName', assignee_name
        ),
        now()
      );
    END IF;

    -- Remove from pending table
    DELETE FROM pending_task_assignments WHERE id = pending_record.id;
  END LOOP;
END;
$$;

-- Trigger to auto-process pending notifications whenever ANY notification is created
CREATE OR REPLACE FUNCTION auto_process_pending_task_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Process pending task assignments in the background
  PERFORM process_pending_task_notifications();
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_process_task_notifications_trigger
AFTER INSERT ON notifications
FOR EACH STATEMENT
EXECUTE FUNCTION auto_process_pending_task_notifications();

-- Function for manual refresh from frontend
CREATE OR REPLACE FUNCTION refresh_task_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM process_pending_task_notifications();
END;
$$;

-- Cleanup function for old pending assignments (can be called periodically if needed)
CREATE OR REPLACE FUNCTION cleanup_old_pending_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM pending_task_assignments
  WHERE assigned_at < (now() - INTERVAL '1 day');
END;
$$;

-- Recreate the track_task_assignments trigger to populate pending table
CREATE OR REPLACE FUNCTION track_task_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignee_id UUID;
  new_assignees UUID[];
  old_assignees UUID[];
BEGIN
  -- Handle both INSERT (OLD is NULL) and UPDATE cases
  IF TG_OP = 'INSERT' THEN
    old_assignees := ARRAY[]::UUID[];
  ELSE
    old_assignees := COALESCE(OLD.assignees, ARRAY[]::UUID[]);
  END IF;
  
  new_assignees := COALESCE(NEW.assignees, ARRAY[]::UUID[]);

  -- Only process if there are new assignees
  IF array_length(new_assignees, 1) > 0 THEN
    -- Find newly added assignees (present in NEW but not in OLD)
    FOR assignee_id IN 
      SELECT unnest(new_assignees)
      EXCEPT
      SELECT unnest(old_assignees)
    LOOP
      BEGIN
        -- Track this assignment (will be converted to notification after 4 minutes)
        INSERT INTO pending_task_assignments (task_id, assignee_id, assigned_by, assigned_at)
        VALUES (NEW.id, assignee_id, COALESCE(NEW.updated_by, NEW.created_by), NEW.updated_at)
        ON CONFLICT (task_id, assignee_id) DO UPDATE
        SET assigned_at = NEW.updated_at,
            assigned_by = COALESCE(NEW.updated_by, NEW.created_by);
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but don't fail the task update
          RAISE WARNING 'Failed to track task assignment: %', SQLERRM;
      END;
    END LOOP;
  END IF;

  -- Remove tracking for assignees who were removed (only if there were old assignees)
  IF array_length(old_assignees, 1) > 0 THEN
    BEGIN
      DELETE FROM pending_task_assignments
      WHERE task_id = NEW.id
        AND assignee_id = ANY(
          SELECT unnest(old_assignees)
          EXCEPT
          SELECT unnest(new_assignees)
        );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to remove task assignment tracking: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER track_task_assignments_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION track_task_assignments();