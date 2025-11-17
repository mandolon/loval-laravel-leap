
-- Enable RLS on workspace_members and users tables (if not already enabled)
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all workspace members
CREATE POLICY "Authenticated users can view workspace members"
ON workspace_members
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Allow authenticated users to read all users
CREATE POLICY "Authenticated users can view users"
ON users
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);
