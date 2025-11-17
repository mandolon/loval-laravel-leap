-- Revert RLS changes to restore original NO-RLS architecture
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop the policies we mistakenly created
DROP POLICY IF EXISTS "Authenticated users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;