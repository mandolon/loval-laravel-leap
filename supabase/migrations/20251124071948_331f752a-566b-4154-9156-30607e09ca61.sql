-- Improved task assignment notifications with better error handling
-- Drop existing objects
DROP TRIGGER IF EXISTS track_task_assignments_trigger ON public.tasks;
DROP FUNCTION IF EXISTS track_task_assignments();

-- Recreated improved tracking function with INSERT handling and null safety
CREATE OR REPLACE FUNCTION track_task_assignments()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger without WHEN clause - function handles empty arrays gracefully
CREATE TRIGGER track_task_assignments_trigger
AFTER INSERT OR UPDATE OF assignees ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION track_task_assignments();

-- Update cron job to use proper syntax
SELECT cron.unschedule('process-task-assignment-notifications');
SELECT cron.schedule(
  'process-task-assignment-notifications',
  '* * * * *',
  $$SELECT create_confirmed_task_assignment_notifications();$$
);