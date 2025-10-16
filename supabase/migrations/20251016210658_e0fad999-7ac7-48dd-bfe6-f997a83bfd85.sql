-- Fix security linter warnings from Phase 1 migration

-- Fix 1: Add missing RLS policies for project_members table
CREATE POLICY "Users can view project team members" ON project_members
FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);

CREATE POLICY "Users can add team members to projects" ON project_members
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);

CREATE POLICY "Users can update project team members" ON project_members
FOR UPDATE USING (
  project_id IN (
    SELECT id FROM projects WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);

CREATE POLICY "Users can remove team members from projects" ON project_members
FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
);

-- Fix 2: Add missing RLS policies for invoice_line_items table
CREATE POLICY "Users can view invoice line items" ON invoice_line_items
FOR SELECT USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "Users can add invoice line items" ON invoice_line_items
FOR INSERT WITH CHECK (
  invoice_id IN (
    SELECT id FROM invoices WHERE project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "Users can update invoice line items" ON invoice_line_items
FOR UPDATE USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "Users can delete invoice line items" ON invoice_line_items
FOR DELETE USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  )
);

-- Fix 3: Add SET search_path to all functions
CREATE OR REPLACE FUNCTION generate_short_id(prefix text)
RETURNS text 
LANGUAGE plpgsql 
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := prefix || '-';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION auto_create_project_folders()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folder_names text[] := ARRAY['Pre-Design', 'Design', 'Permit', 'Build', 'Plans', 'Photos', 'Attachments'];
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

CREATE OR REPLACE FUNCTION generate_file_share_token()
RETURNS text 
LANGUAGE plpgsql 
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION auto_generate_share_token()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_shareable = true AND NEW.share_token IS NULL THEN
    NEW.share_token := generate_file_share_token();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_project_task_counters()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE projects 
    SET total_tasks = total_tasks + 1,
        completed_tasks = CASE WHEN NEW.status = 'done_completed' THEN completed_tasks + 1 ELSE completed_tasks END
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE projects 
      SET total_tasks = total_tasks - 1,
          completed_tasks = CASE WHEN OLD.status = 'done_completed' THEN completed_tasks - 1 ELSE completed_tasks END
      WHERE id = OLD.project_id;
    ELSIF OLD.status != NEW.status THEN
      UPDATE projects 
      SET completed_tasks = completed_tasks + 
          CASE 
            WHEN NEW.status = 'done_completed' AND OLD.status != 'done_completed' THEN 1
            WHEN OLD.status = 'done_completed' AND NEW.status != 'done_completed' THEN -1
            ELSE 0
          END
      WHERE id = NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_project_member_counter()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE projects SET team_member_count = team_member_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE projects SET team_member_count = team_member_count - 1 WHERE id = OLD.project_id;
  END IF;
  RETURN NEW;
END;
$$;