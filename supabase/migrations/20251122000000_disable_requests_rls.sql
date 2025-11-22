-- =====================================================
-- Disable RLS for Requests Table
-- =====================================================
-- Per requirements: Use UI filtering only, not database RLS

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view workspace requests" ON requests;
DROP POLICY IF EXISTS "Users can create requests" ON requests;
DROP POLICY IF EXISTS "Users can update workspace requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their requests" ON requests;

-- Disable RLS on requests table
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
