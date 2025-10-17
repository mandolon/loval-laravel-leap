-- Remove the RLS policy
DROP POLICY IF EXISTS "Users can view other users' basic info" ON users;

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;