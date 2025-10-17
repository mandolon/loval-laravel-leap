-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for task-files bucket
CREATE POLICY "Users can view files for tasks in their workspace projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-files' AND
  EXISTS (
    SELECT 1 FROM files f
    JOIN tasks t ON f.task_id = t.id
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    JOIN users u ON u.id = wm.user_id
    WHERE f.storage_path = storage.objects.name
    AND u.auth_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files for tasks in their workspace projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-files' AND
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    JOIN users u ON u.id = wm.user_id
    WHERE u.auth_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files they uploaded"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-files' AND
  EXISTS (
    SELECT 1 FROM files f
    JOIN users u ON f.uploaded_by = u.id
    WHERE f.storage_path = storage.objects.name
    AND u.auth_id = auth.uid()
  )
);