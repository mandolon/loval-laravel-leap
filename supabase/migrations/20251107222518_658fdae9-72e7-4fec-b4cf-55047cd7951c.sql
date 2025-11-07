-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Permissive policies for users (allow all authenticated users)
CREATE POLICY "Allow authenticated users to select users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert users"
ON users FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update users"
ON users FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete users"
ON users FOR DELETE
TO authenticated
USING (true);