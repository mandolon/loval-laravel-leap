-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all users (needed for team member selection, etc.)
CREATE POLICY "Authenticated users can view all users"
ON users
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
TO authenticated
USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

-- The insert policy is handled by the trigger when a user signs up via auth
-- No need for manual inserts from the app