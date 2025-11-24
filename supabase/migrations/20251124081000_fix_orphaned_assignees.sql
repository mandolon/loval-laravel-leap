-- Fix orphaned assignees in tasks and make tracking trigger resilient to FK failures

-- Step 1: Clean up orphaned assignees from existing tasks
-- Remove any assignee IDs that don't exist in the users table
UPDATE tasks
SET assignees = (
  SELECT ARRAY_AGG(assignee_id)
  FROM unnest(assignees) AS assignee_id
  WHERE EXISTS (SELECT 1 FROM users WHERE id = assignee_id)
)
WHERE assignees IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(assignees) AS assignee_id
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = assignee_id)
  );

-- Step 2: Update the tracking function to gracefully handle invalid user IDs
-- This prevents FK constraint failures from blocking task updates
CREATE OR REPLACE FUNCTION track_task_assignments()
RETURNS TRIGGER AS $$
DECLARE
  assignee_id UUID;
  new_assignees UUID[];
  old_assignees UUID[];
  user_exists BOOLEAN;
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
        -- Check if the user exists before trying to insert
        SELECT EXISTS(SELECT 1 FROM users WHERE id = assignee_id) INTO user_exists;
        
        IF user_exists THEN
          -- Track this assignment (will be converted to notification after 4 minutes)
          INSERT INTO pending_task_assignments (task_id, assignee_id, assigned_by, assigned_at)
          VALUES (NEW.id, assignee_id, COALESCE(NEW.updated_by, NEW.created_by), NEW.updated_at)
          ON CONFLICT (task_id, assignee_id) DO UPDATE
          SET assigned_at = NEW.updated_at,
              assigned_by = COALESCE(NEW.updated_by, NEW.created_by);
        ELSE
          -- Log warning for orphaned assignee but don't fail
          RAISE WARNING 'Skipping orphaned assignee % for task %', assignee_id, NEW.id;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but don't fail the task update
          RAISE WARNING 'Failed to track task assignment for assignee %: %', assignee_id, SQLERRM;
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

-- Step 3: Add a function to validate and clean assignees before they're saved
-- This prevents orphaned IDs from being added in the first place
CREATE OR REPLACE FUNCTION validate_task_assignees()
RETURNS TRIGGER AS $$
DECLARE
  valid_assignees UUID[];
  invalid_count INTEGER := 0;
BEGIN
  -- If assignees is NULL or empty, nothing to validate
  IF NEW.assignees IS NULL OR array_length(NEW.assignees, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Filter out any assignee IDs that don't exist in users table
  SELECT ARRAY_AGG(assignee_id) INTO valid_assignees
  FROM unnest(NEW.assignees) AS assignee_id
  WHERE EXISTS (SELECT 1 FROM users WHERE id = assignee_id);

  -- Count how many invalid assignees were filtered out
  invalid_count := array_length(NEW.assignees, 1) - COALESCE(array_length(valid_assignees, 1), 0);

  IF invalid_count > 0 THEN
    RAISE WARNING 'Filtered % invalid assignee(s) from task %', invalid_count, NEW.id;
  END IF;

  -- Update the assignees array to only include valid users
  NEW.assignees := COALESCE(valid_assignees, ARRAY[]::UUID[]);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the validation trigger that runs BEFORE insert/update
DROP TRIGGER IF EXISTS validate_task_assignees_trigger ON tasks;
CREATE TRIGGER validate_task_assignees_trigger
BEFORE INSERT OR UPDATE OF assignees ON tasks
FOR EACH ROW
EXECUTE FUNCTION validate_task_assignees();

-- Step 4: Add a helper function to clean up orphaned assignees manually
CREATE OR REPLACE FUNCTION cleanup_orphaned_assignees()
RETURNS TABLE (
  task_id UUID,
  task_title TEXT,
  removed_assignees UUID[]
) AS $$
BEGIN
  RETURN QUERY
  WITH cleaned_tasks AS (
    UPDATE tasks
    SET assignees = (
      SELECT ARRAY_AGG(assignee_id)
      FROM unnest(tasks.assignees) AS assignee_id
      WHERE EXISTS (SELECT 1 FROM users WHERE id = assignee_id)
    )
    WHERE tasks.assignees IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(tasks.assignees) AS assignee_id
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = assignee_id)
      )
    RETURNING 
      tasks.id,
      tasks.title,
      (
        SELECT ARRAY_AGG(assignee_id)
        FROM unnest(tasks.assignees) AS assignee_id
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = assignee_id)
      ) AS removed
  )
  SELECT 
    cleaned_tasks.id,
    cleaned_tasks.title,
    cleaned_tasks.removed
  FROM cleaned_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Report: Show tasks with orphaned assignees (for monitoring)
COMMENT ON FUNCTION cleanup_orphaned_assignees() IS 
'Removes orphaned assignee IDs from all tasks and returns information about what was cleaned. 
Run this to fix existing data: SELECT * FROM cleanup_orphaned_assignees();';
