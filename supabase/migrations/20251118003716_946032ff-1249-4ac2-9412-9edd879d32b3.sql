-- Migrate existing AI-generated files from Pre-Design to MyHome AI Project Assets folder
DO $$
DECLARE
  proj RECORD;
  pre_design_folder_id UUID;
  ai_assets_folder_id UUID;
BEGIN
  -- Loop through all projects
  FOR proj IN SELECT id FROM projects WHERE deleted_at IS NULL
  LOOP
    -- Get Pre-Design folder ID
    SELECT id INTO pre_design_folder_id
    FROM folders
    WHERE project_id = proj.id 
      AND name = 'Pre-Design'
      AND deleted_at IS NULL
    LIMIT 1;
    
    -- Get MyHome AI Project Assets folder ID
    SELECT id INTO ai_assets_folder_id
    FROM folders
    WHERE project_id = proj.id 
      AND name = 'MyHome AI Project Assets'
      AND deleted_at IS NULL
    LIMIT 1;
    
    -- If both folders exist, migrate the files
    IF pre_design_folder_id IS NOT NULL AND ai_assets_folder_id IS NOT NULL THEN
      -- Update project.chats.md
      UPDATE files
      SET folder_id = ai_assets_folder_id
      WHERE project_id = proj.id
        AND folder_id = pre_design_folder_id
        AND filename = 'project.chats.md'
        AND deleted_at IS NULL;
      
      -- Update project.tasks.md
      UPDATE files
      SET folder_id = ai_assets_folder_id
      WHERE project_id = proj.id
        AND folder_id = pre_design_folder_id
        AND filename = 'project.tasks.md'
        AND deleted_at IS NULL;
        
      RAISE NOTICE 'Migrated AI files for project: %', proj.id;
    END IF;
  END LOOP;
END $$;