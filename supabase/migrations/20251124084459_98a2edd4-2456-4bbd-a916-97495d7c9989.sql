-- Clean up existing orphaned assignees in tasks table
UPDATE tasks
SET assignees = ARRAY(
  SELECT assignee_id
  FROM unnest(assignees) AS assignee_id
  WHERE assignee_id IN (SELECT id FROM users WHERE deleted_at IS NULL)
)
WHERE assignees IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM unnest(assignees) AS assignee_id
    WHERE assignee_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL)
  );

-- Clean up orphaned records in pending_task_assignments
DELETE FROM pending_task_assignments
WHERE assignee_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL)
   OR assigned_by NOT IN (SELECT id FROM users WHERE deleted_at IS NULL);

-- Create function to validate and clean assignees before insert/update
CREATE OR REPLACE FUNCTION validate_task_assignees()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove any NULL values and invalid user IDs from assignees array
  IF NEW.assignees IS NOT NULL THEN
    NEW.assignees := ARRAY(
      SELECT assignee_id
      FROM unnest(NEW.assignees) AS assignee_id
      WHERE assignee_id IS NOT NULL
        AND assignee_id IN (SELECT id FROM users WHERE deleted_at IS NULL)
    );
    
    -- If array becomes empty, set to empty array instead of NULL
    IF array_length(NEW.assignees, 1) IS NULL THEN
      NEW.assignees := ARRAY[]::UUID[];
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate assignees before insert/update
DROP TRIGGER IF EXISTS validate_task_assignees_trigger ON tasks;
CREATE TRIGGER validate_task_assignees_trigger
  BEFORE INSERT OR UPDATE OF assignees ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_assignees();