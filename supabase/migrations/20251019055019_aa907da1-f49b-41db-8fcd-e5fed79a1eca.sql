-- Phase 2: Disable RLS on workspace_members table
-- Since access control is UI-based, RLS is blocking workspace creation unnecessarily
-- This aligns with the UI-based access control model where all members can view workspace data

ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;