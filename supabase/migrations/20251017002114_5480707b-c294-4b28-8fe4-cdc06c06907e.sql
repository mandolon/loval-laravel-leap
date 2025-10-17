-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read basic user information
-- This is needed for displaying user names/avatars in team lists
CREATE POLICY "Users can view other users' basic info"
ON users
FOR SELECT
TO authenticated
USING (true);