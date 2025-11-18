-- Update the auto_create_project_folders function to include MyHome AI Project Assets
CREATE OR REPLACE FUNCTION auto_create_project_folders()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  folder_names text[] := ARRAY['Pre-Design', 'Design', 'Permit', 'Build', 'Plans', 'Photos', 'Attachments', '3D Models', 'MyHome AI Project Assets'];
  folder_name text;
BEGIN
  FOREACH folder_name IN ARRAY folder_names
  LOOP
    INSERT INTO folders (project_id, name, is_system_folder, created_by)
    VALUES (NEW.id, folder_name, true, NEW.created_by);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add MyHome AI Project Assets folder to all existing projects that don't have it
INSERT INTO folders (project_id, name, is_system_folder, created_by)
SELECT 
  p.id as project_id,
  'MyHome AI Project Assets' as name,
  true as is_system_folder,
  p.created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM folders f 
  WHERE f.project_id = p.id 
  AND f.name = 'MyHome AI Project Assets'
  AND f.deleted_at IS NULL
)
AND p.deleted_at IS NULL;