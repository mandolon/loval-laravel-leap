-- Alternative task assignment notifications WITHOUT pg_cron dependency
-- This migration adds immediate notification creation after 4 minutes using a different approach

-- Drop pg_cron dependency
SELECT cron.unschedule('process-task-assignment-notifications') WHERE EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
);

-- Create a function that will be called when querying notifications
-- This processes pending assignments older than 4 minutes on-demand
CREATE OR REPLACE FUNCTION process_pending_task_notifications()
RETURNS void AS $$
DECLARE
  pending_record RECORD;
  assigner_name TEXT;
  assignee_name TEXT;
  task_title TEXT;
  project_name TEXT;
  workspace_name TEXT;
  workspace_id_val UUID;
  project_id_val UUID;
  current_assignees UUID[];
BEGIN
  -- Process assignments that are 4+ minutes old
  FOR pending_record IN
    SELECT * FROM pending_task_assignments
    WHERE assigned_at <= (now() - INTERVAL '4 minutes')
    FOR UPDATE SKIP LOCKED
    LIMIT 50  -- Process in batches to avoid long-running transactions
  LOOP
    BEGIN
      -- Verify the assignee is still assigned to the task
      SELECT assignees, project_id INTO current_assignees, project_id_val
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
          project_id_val,
          'task_assigned',
          COALESCE(assigner_name, 'Someone') || ' assigned you a task',
          task_title,
          '/team/workspace/' || workspace_id_val || '/project/' || project_id_val || '/tasks',
          jsonb_build_object(
            'actorId', pending_record.assigned_by,
            'actorName', COALESCE(assigner_name, 'Unknown'),
            'projectId', project_id_val,
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
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue processing other records
      RAISE WARNING 'Failed to process pending task assignment %: %', pending_record.id, SQLERRM;
      -- Delete the problematic record so it doesn't block future processing
      DELETE FROM pending_task_assignments WHERE id = pending_record.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on notifications table to auto-process pending notifications
-- This runs whenever someone queries notifications, ensuring they see recent task assignments
CREATE OR REPLACE FUNCTION trigger_process_pending_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Process pending notifications in the background
  -- This will be called when notifications are inserted/updated
  PERFORM process_pending_task_notifications();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires on any notification activity (which happens frequently)
DROP TRIGGER IF EXISTS auto_process_pending_notifications ON notifications;
CREATE TRIGGER auto_process_pending_notifications
AFTER INSERT ON notifications
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_process_pending_notifications();

-- Also create a view that processes pending notifications when queried
-- Frontend can query this instead of notifications directly
CREATE OR REPLACE VIEW notifications_with_processing AS
SELECT 
  (process_pending_task_notifications()) AS processed,
  n.*
FROM notifications n;

-- Add a helper function for the frontend to call manually if needed
CREATE OR REPLACE FUNCTION refresh_task_notifications()
RETURNS TABLE (
  notifications_created INTEGER
) AS $$
DECLARE
  initial_count INTEGER;
  final_count INTEGER;
BEGIN
  -- Count notifications before processing
  SELECT COUNT(*) INTO initial_count FROM notifications WHERE type = 'task_assigned';
  
  -- Process pending notifications
  PERFORM process_pending_task_notifications();
  
  -- Count notifications after processing
  SELECT COUNT(*) INTO final_count FROM notifications WHERE type = 'task_assigned';
  
  RETURN QUERY SELECT (final_count - initial_count)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old pending records (older than 7 days) that somehow weren't processed
-- This can be called periodically via the frontend or manually
CREATE OR REPLACE FUNCTION cleanup_old_pending_assignments()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pending_task_assignments
  WHERE assigned_at < (now() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
