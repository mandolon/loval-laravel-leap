-- Update auto_create_project_folders to include '3D Models'
CREATE OR REPLACE FUNCTION auto_create_project_folders()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folder_names text[] := ARRAY['Pre-Design', 'Design', 'Permit', 'Build', 'Plans', 'Photos', 'Attachments', '3D Models'];
  folder_name text;
BEGIN
  FOREACH folder_name IN ARRAY folder_names
  LOOP
    INSERT INTO folders (project_id, name, is_system_folder, created_by)
    VALUES (NEW.id, folder_name, true, NEW.created_by);
  END LOOP;
  RETURN NEW;
END;
$$;

-- Add 3D Models folder to existing projects
INSERT INTO folders (project_id, name, is_system_folder, created_by)
SELECT p.id, '3D Models', true, p.created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM folders f 
  WHERE f.project_id = p.id 
  AND f.name = '3D Models'
  AND f.deleted_at IS NULL
);